# Standalone viewer of scenes imported by the unmodified, pinned Godot VRM editor add-on.
extends SceneTree

func _initialize():
	call_deferred("run")

func sample(model):
	var result = {}
	for mesh in model.find_children("*", "MeshInstance3D", true, false):
		var skeleton = mesh.get_node(mesh.skeleton)
		skeleton.force_update_all_bone_transforms()
		var arrays = mesh.mesh.surface_get_arrays(0)
		var positions = arrays[Mesh.ARRAY_VERTEX]
		var bones = arrays[Mesh.ARRAY_BONES]
		var weights = arrays[Mesh.ARRAY_WEIGHTS]
		var points = []
		for i in positions.size():
			var p = Vector3.ZERO
			for j in 4:
				var bind = bones[i * 4 + j]
				var bone = mesh.skin.get_bind_bone(bind)
				if mesh.skin.get_bind_name(bind) != "":
					bone = skeleton.find_bone(mesh.skin.get_bind_name(bind))
				assert(bone >= 0)
				p += (skeleton.global_transform * skeleton.get_bone_global_pose(bone) * mesh.skin.get_bind_pose(bind) * positions[i]) * weights[i * 4 + j]
			points.append([p.x, p.y, p.z])
		result[str(mesh.name)] = points
	return result

func run():
	var args = OS.get_cmdline_user_args()
	var model = load(args[0]).instantiate()
	root.add_child(model)
	var skeleton = model.find_children("*", "Skeleton3D", true, false)[0]
	var names = []
	for i in skeleton.get_bone_count(): names.append(str(skeleton.get_bone_name(i)))
	var meta = model.get("vrm_meta")
	var result = {"engine": Engine.get_version_info().string, "bones": names, "name": meta.title, "authors": Array(meta.authors), "license": meta.license_url, "neutral": sample(model), "poses": {}, "materials": {}}
	for config in [["LeftLowerArm", Vector3(0,0,1), PI/3], ["RightLowerLeg", Vector3(1,0,0), PI/4]]:
		var bone = skeleton.find_bone(config[0])
		assert(bone >= 0)
		var previous = skeleton.get_bone_pose_rotation(bone)
		var parent = skeleton.get_bone_parent(bone)
		var parent_basis = skeleton.get_bone_global_pose(parent).basis
		var global_basis = skeleton.get_bone_global_pose(bone).basis
		var rotation = (parent_basis.inverse() * Basis(config[1], config[2]) * global_basis).get_rotation_quaternion()
		skeleton.set_bone_pose_rotation(bone, rotation)
		result.poses[config[0]] = sample(model)
		skeleton.set_bone_pose_rotation(bone, previous)
	result.reset = sample(model)
	for mesh in model.find_children("*", "MeshInstance3D", true, false):
		var material = mesh.mesh.surface_get_material(0)
		result.materials[str(mesh.name)] = {"color": [material.albedo_color.r, material.albedo_color.g, material.albedo_color.b], "metallic": material.metallic, "roughness": material.roughness, "texture": [material.albedo_texture.get_width(), material.albedo_texture.get_height()]}
	var camera = Camera3D.new()
	root.add_child(camera)
	camera.position = Vector3(0,1,4)
	camera.look_at(Vector3(0,0.9,0))
	camera.current = true
	var light = DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-25,-20,0)
	root.add_child(light)
	var environment = WorldEnvironment.new()
	environment.environment = Environment.new()
	environment.environment.background_mode = Environment.BG_COLOR
	environment.environment.background_color = Color(0.9,0.9,0.9)
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_color = Color.WHITE
	environment.environment.ambient_light_energy = 0.7
	root.add_child(environment)
	if DisplayServer.get_name() != "headless":
		await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(args[1] + ".png")
	result.rendered = DisplayServer.get_name() != "headless"
	var file = FileAccess.open(args[1] + ".json", FileAccess.WRITE)
	file.store_string(JSON.stringify(result, "  "))
	file.close()
	quit()
