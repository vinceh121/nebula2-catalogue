import { Component } from "preact";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AmbientLight, AxesHelper, DirectionalLight, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from "three";


class ProtoViewer extends Component {
	domElement;

	constructor(props, ctx) {
		super(props, ctx);
		const { proto } = props;

		const scene = new Scene();
		const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
		camera.position.set(50, 50, 50);

		const renderer = new WebGLRenderer();
		renderer.setSize(500, 500);

		const render3d = () => {
			renderer.render(scene, camera);
		};

		const ambLight = new AmbientLight(0xffffff, 0.6);
		ambLight.position.set(0, 1, 0);
		scene.add(ambLight);

		const dirLight = new DirectionalLight(0xffffff, 1);
		dirLight.position.set(1, 1, 1).normalize();
		scene.add(dirLight);

		const grid = new GridHelper(2000, 20, 0x888888, 0x444444);
		scene.add(grid);

		const axes = new AxesHelper(5);
		scene.add(axes);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.addEventListener("change", render3d);
		orbit.minDistance = 2;
		orbit.maxDistance = 300;
		orbit.target.set(0, 0, 0);
		orbit.update();

		this.domElement = renderer.domElement;

		const loader = new GLTFLoader();
		fetch(`/assets/${proto}.gltf`).then(res => res.json()).then(data => {
			// HACK: we don't use loader.load() because we want to add the unlit extension cause
			//	I don't want to mess up the downloads with this
			data.extensionsUsed = ["KHR_materials_unlit"];

			for (const mat of data.materials) {
				mat.extensions = { "KHR_materials_unlit": {} };
			}

			loader.parse(data, "/assets/", gltf => {
				scene.add(gltf.scene);
				render3d();
			}, console.error);
		});
	}

	shouldComponentUpdate() {
		return false;
	}

	componentDidMount() {
		this.base.appendChild(this.domElement);
	}

	render() {
		return (
			<div>
			</div>
		);
	}
}


export default ProtoViewer;
