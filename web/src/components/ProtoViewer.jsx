import { Component } from "preact";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AmbientLight, AxesHelper, DirectionalLight, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import Alert from "./Alert";
import { alignCameraToScene } from "./threeDeeUtils";


class ProtoViewer extends Component {
	renderer;
	domElement;

	constructor(props, ctx) {
		super(props, ctx);
	}

	shouldComponentUpdate() {
		return false;
	}

	disposeWebGL() {
		if (this.domElement) {
			this.base.removeChild(this.domElement);
		}
		if (this.renderer) {
			this.renderer.dispose();
			this.renderer.forceContextLoss();
		}
		this.domElement = undefined;
	}

	componentDidMount() {
		const scene = new Scene();
		const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.set(50, 50, 50);

		this.renderer = new WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		const render3d = () => {
			this.renderer.render(scene, camera);
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

		const orbit = new OrbitControls(camera, this.renderer.domElement);
		orbit.addEventListener("change", render3d);
		orbit.minDistance = 2;
		orbit.maxDistance = 300;
		orbit.target.set(0, 0, 0);
		orbit.update();

		this.domElement = this.renderer.domElement;

		const loader = new GLTFLoader();
		fetch(`/assets/${this.props.proto}.gltf`).then(res => {
			if (res.ok) {
				return res.json();
			} else {
				throw new Error(`${res.status} ${res.statusText}`);
			}
		}).then(data => {
			// HACK: we don't use loader.load() because we want to add the unlit extension cause
			//	I don't want to mess up the downloads with this
			data.extensionsUsed = ["KHR_materials_unlit"];

			for (const mat of data.materials) {
				mat.extensions = { "KHR_materials_unlit": {} };
			}

			loader.parse(data, "/assets/", gltf => {
				alignCameraToScene(gltf.scene, camera);

				scene.add(gltf.scene);
				render3d();
			}, console.error);
		}, err => {
			this.setState({ error: err.toString() });
			this.disposeWebGL();
		});

		this.base.appendChild(this.domElement);
	}

	componentWillUnmount() {
		this.disposeWebGL();
	}

	render() {
		return (
			<div>
				{this.state.error ? <Alert>{this.state.error.toString()}</Alert> : undefined}
			</div>
		);
	}
}


export default ProtoViewer;
