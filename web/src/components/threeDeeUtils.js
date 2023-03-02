import { Box3, Vector3 } from "three";

function alignCameraToScene(scene, camera) {
	const camOffset = new Vector3(1, 1.4, -1);
	const bb = new Box3();
	scene.traverse(child => {
		bb.expandByObject(child);
	});
	const median = bb.min.lerp(bb.max, 0.5);
	const dist = bb.max.distanceTo(bb.min);
	camera.position.copy(camOffset).multiplyScalar(dist / 1.3).add(median);
	camera.lookAt(median);
}

function fixInfinity(vec) {
	vec.x = Number.isFinite(vec.x) ? vec.x : 0;
	vec.y = Number.isFinite(vec.y) ? vec.y : 0;
	vec.z = Number.isFinite(vec.z) ? vec.z : 0;
}

export { alignCameraToScene, fixInfinity };
