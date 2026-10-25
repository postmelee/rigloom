//! Canonical placement in a prepared world frame; source geometry stays immutable.
use serde::{Deserialize, Serialize};
pub type Point = [f64; 3];
pub type Matrix = [[f64; 4]; 4];
pub const IDENTITY: Matrix = [
    [1., 0., 0., 0.],
    [0., 1., 0., 0.],
    [0., 0., 1., 0.],
    [0., 0., 0., 1.],
];
pub const BONES: [&str; 15] = [
    "hips",
    "spine",
    "head",
    "leftUpperLeg",
    "leftLowerLeg",
    "leftFoot",
    "rightUpperLeg",
    "rightLowerLeg",
    "rightFoot",
    "leftUpperArm",
    "leftLowerArm",
    "leftHand",
    "rightUpperArm",
    "rightLowerArm",
    "rightHand",
];
pub const PARENTS: [Option<usize>; 15] = [
    None,
    Some(0),
    Some(1),
    Some(0),
    Some(3),
    Some(4),
    Some(0),
    Some(6),
    Some(7),
    Some(1),
    Some(9),
    Some(10),
    Some(1),
    Some(12),
    Some(13),
];
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Frame {
    pub up: String,
    pub turn: u8,
    pub scale: f64,
    pub floor: bool,
}
impl Default for Frame {
    fn default() -> Self {
        Self {
            up: "Y".into(),
            turn: 0,
            scale: 1.,
            floor: true,
        }
    }
}
#[derive(Debug, Serialize)]
pub struct Placement {
    pub names: Vec<String>,
    pub parents: Vec<Option<usize>>,
    pub joints: Vec<Point>,
    pub matrix: Matrix,
    pub bounds: [Point; 2],
}
pub fn multiply(a: Matrix, b: Matrix) -> Matrix {
    std::array::from_fn(|c| std::array::from_fn(|r| (0..4).map(|k| a[k][r] * b[c][k]).sum()))
}
pub fn point(m: Matrix, p: Point) -> Point {
    std::array::from_fn(|r| m[0][r] * p[0] + m[1][r] * p[1] + m[2][r] * p[2] + m[3][r])
}
pub fn distance(a: Point, b: Point) -> f64 {
    a.iter()
        .zip(b)
        .map(|(a, b)| (a - b).powi(2))
        .sum::<f64>()
        .sqrt()
}
pub fn source(bytes: &[u8]) -> Result<gltf::Gltf, String> {
    let report = crate::inspect_glb(bytes);
    if !report.preview_allowed {
        return Err("Source inspection must pass before placing joints.".into());
    }
    if report.inventory.skins > 0 {
        return Err("Existing skins are preserved. Use Mapping for this model.".into());
    }
    gltf::Gltf::from_slice(bytes).map_err(|e| e.to_string())
}
pub fn worlds(gltf: &gltf::Gltf) -> Vec<Option<Matrix>> {
    let mut out = vec![None; gltf.nodes().len()];
    let nodes: Vec<_> = gltf.nodes().collect();
    let mut stack: Vec<_> = gltf
        .scenes()
        .next()
        .unwrap()
        .nodes()
        .map(|n| (n.index(), IDENTITY))
        .collect();
    while let Some((i, parent)) = stack.pop() {
        let m = multiply(
            parent,
            nodes[i].transform().matrix().map(|c| c.map(f64::from)),
        );
        out[i] = Some(m);
        for child in nodes[i].children() {
            stack.push((child.index(), m));
        }
    }
    out
}
pub fn prepare(bytes: &[u8], frame: &Frame) -> Result<Placement, String> {
    if !["X", "Y", "Z"].contains(&frame.up.as_str())
        || frame.turn > 3
        || !frame.scale.is_finite()
        || !(0.000001..=1000000.).contains(&frame.scale)
    {
        return Err("Choose X/Y/Z up, a quarter turn, and a positive finite scale.".into());
    }
    let gltf = source(bytes)?;
    let world = worlds(&gltf);
    let mut rotation = IDENTITY;
    // Right-handed rotations: +Z or +X becomes +Y; yaw is around prepared +Y.
    if frame.up == "Z" {
        rotation = [
            [1., 0., 0., 0.],
            [0., 0., -1., 0.],
            [0., 1., 0., 0.],
            [0., 0., 0., 1.],
        ];
    }
    if frame.up == "X" {
        rotation = [
            [0., 1., 0., 0.],
            [-1., 0., 0., 0.],
            [0., 0., 1., 0.],
            [0., 0., 0., 1.],
        ];
    }
    let (s, c) = (f64::from(frame.turn) * std::f64::consts::FRAC_PI_2).sin_cos();
    rotation = multiply(
        [
            [c, 0., -s, 0.],
            [0., 1., 0., 0.],
            [s, 0., c, 0.],
            [0., 0., 0., 1.],
        ],
        rotation,
    );
    for column in rotation.iter_mut().take(3) {
        for v in column.iter_mut().take(3) {
            *v *= frame.scale;
        }
    }
    let mut bounds = [[f64::INFINITY; 3], [f64::NEG_INFINITY; 3]];
    for node in gltf.nodes() {
        if let (Some(mesh), Some(w)) = (node.mesh(), world[node.index()]) {
            let m = multiply(rotation, w);
            for primitive in mesh.primitives() {
                let reader = primitive.reader(|_| gltf.blob.as_deref());
                for p in reader.read_positions().ok_or("Missing positions")? {
                    let p = point(m, p.map(f64::from));
                    for i in 0..3 {
                        bounds[0][i] = bounds[0][i].min(p[i]);
                        bounds[1][i] = bounds[1][i].max(p[i]);
                    }
                }
            }
        }
    }
    let height = bounds[1][1] - bounds[0][1];
    if !height.is_finite() || height < 1e-6 {
        return Err("Model needs a nonzero height. Check the up axis and scale.".into());
    }
    rotation[3][0] = -(bounds[0][0] + bounds[1][0]) / 2.;
    rotation[3][2] = -(bounds[0][2] + bounds[1][2]) / 2.;
    if frame.floor {
        rotation[3][1] = -bounds[0][1];
    }
    for p in &mut bounds {
        for i in 0..3 {
            p[i] += rotation[3][i];
        }
    }
    let h = height;
    let w = bounds[1][0] - bounds[0][0];
    let y = bounds[0][1];
    let z = (bounds[1][2] - bounds[0][2]) * 0.2;
    let mut joints = vec![
        [0., y + h * 0.52, 0.],
        [0., y + h * 0.68, 0.],
        [0., y + h * 0.91, 0.],
    ];
    for sign in [1., -1.] {
        joints.extend([
            [sign * w * 0.085, y + h * 0.49, 0.],
            [sign * w * 0.085, y + h * 0.27, 0.],
            [sign * w * 0.085, y + h * 0.04, z],
        ]);
    }
    for sign in [1., -1.] {
        joints.extend([
            [sign * w * 0.13, y + h * 0.76, 0.],
            [sign * w * 0.30, y + h * 0.76, 0.],
            [sign * w * 0.47, y + h * 0.76, 0.],
        ]);
    }
    Ok(Placement {
        names: BONES.iter().map(|s| s.to_string()).collect(),
        parents: PARENTS.to_vec(),
        joints,
        matrix: rotation,
        bounds,
    })
}
pub fn validate(joints: &[Point]) -> Result<(), String> {
    if joints.len() != BONES.len()
        || joints
            .iter()
            .flatten()
            .any(|x| !x.is_finite() || x.abs() > 1e8)
    {
        return Err("Provide 15 finite joint positions in the prepared model frame.".into());
    }
    for (i, parent) in PARENTS.iter().enumerate() {
        if let Some(p) = parent
            && distance(joints[i], joints[*p]) < 1e-5
        {
            return Err(format!("{} overlaps its parent.", BONES[i]));
        }
    }
    if joints[2][1] <= joints[1][1] || joints[1][1] <= joints[0][1] {
        return Err("Head must be above spine, and spine above hips.".into());
    }
    for (l, r) in [(3, 6), (4, 7), (5, 8), (9, 12), (10, 13), (11, 14)] {
        if joints[l][0] <= joints[r][0] {
            return Err(format!(
                "{} must be on the +X side of {}. Check front orientation.",
                BONES[l], BONES[r]
            ));
        }
    }
    for (a, b, c) in [(3, 4, 5), (6, 7, 8)] {
        if joints[a][1] <= joints[b][1] || joints[b][1] <= joints[c][1] {
            return Err("Place knees below hips and feet below knees.".into());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Vec<u8> {
        let mut bin = vec![];
        for x in [0f32, 0., 0., 1., 2., 3., -1., 1., 1.] {
            bin.extend(x.to_le_bytes());
        }
        let json = serde_json::json!({"asset":{"version":"2.0"},"buffers":[{"byteLength":36}],"bufferViews":[{"buffer":0,"byteLength":36}],"accessors":[{"bufferView":0,"componentType":5126,"count":3,"type":"VEC3","min":[-1,0,0],"max":[1,2,3]}],"meshes":[{"primitives":[{"attributes":{"POSITION":0}}]}],"nodes":[{"mesh":0,"translation":[5,6,7],"scale":[2,2,2]}],"scenes":[{"nodes":[0]}],"scene":0});
        let mut json = serde_json::to_vec(&json).unwrap();
        while !json.len().is_multiple_of(4) {
            json.push(b' ');
        }
        let mut out = vec![];
        for n in [
            0x46546c67u32,
            2,
            (28 + json.len() + bin.len()) as u32,
            json.len() as u32,
            0x4e4f534a,
        ] {
            out.extend(n.to_le_bytes());
        }
        out.extend(json);
        out.extend((bin.len() as u32).to_le_bytes());
        out.extend(0x004e4942u32.to_le_bytes());
        out.extend(bin);
        out
    }
    #[test]
    fn prepares_world_space_without_mutating_input() {
        let bytes = fixture();
        let original = bytes.clone();
        let p = prepare(
            &bytes,
            &Frame {
                scale: 0.5,
                ..Frame::default()
            },
        )
        .unwrap();
        assert_eq!(p.bounds, [[-1., 0., -1.5], [1., 2., 1.5]]);
        validate(&p.joints).unwrap();
        assert_eq!(bytes, original);
    }
    #[test]
    fn axis_and_turn_are_right_handed() {
        let p = prepare(
            &fixture(),
            &Frame {
                up: "Z".into(),
                turn: 1,
                ..Frame::default()
            },
        )
        .unwrap();
        assert!((p.bounds[1][1] - 6.).abs() < 1e-9);
        let m = p.matrix;
        let x = point(m, [1., 0., 0.]);
        let y = point(m, [0., 1., 0.]);
        let origin = point(m, [0., 0., 0.]);
        assert!(distance(x, origin) > 0.9 && distance(y, origin) > 0.9);
    }
    #[test]
    fn rejects_invalid_frame_and_nonhumanoid_edits() {
        let bytes = fixture();
        assert!(
            prepare(
                &bytes,
                &Frame {
                    scale: f64::NAN,
                    ..Frame::default()
                }
            )
            .is_err()
        );
        let mut p = prepare(&bytes, &Frame::default()).unwrap();
        p.joints[2] = p.joints[0];
        assert!(validate(&p.joints).is_err());
        let mut p = prepare(&bytes, &Frame::default()).unwrap();
        p.joints.swap(9, 12);
        assert!(validate(&p.joints).is_err());
    }
}
