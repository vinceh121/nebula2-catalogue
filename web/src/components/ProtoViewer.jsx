import { Component } from "preact";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AmbientLight, AxesHelper, Box3, DirectionalLight, GridHelper, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import Alert from "./Alert";
import { alignCameraToScene, fixInfinity } from "./threeDeeUtils";


class ProtoViewer extends Component {
	renderer;
	domElement;
	scene;
	originalCoords = [];
	explodedCoords = [];

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
			this.renderer = undefined;
		}
		this.domElement = undefined;
	}

	lastChild() {
		return this.scene.children[this.scene.children.length - 1];
	}

	componentDidMount() {
		this.scene = new Scene();
		const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.set(50, 50, 50);

		this.renderer = new WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		const render3d = () => {
			this.renderer.render(this.scene, camera);
		};

		const ambLight = new AmbientLight(0xffffff, 0.6);
		ambLight.position.set(0, 1, 0);
		this.scene.add(ambLight);

		const dirLight = new DirectionalLight(0xffffff, 1);
		dirLight.position.set(1, 1, 1).normalize();
		this.scene.add(dirLight);

		const grid = new GridHelper(2000, 20, 0x888888, 0x444444);
		this.scene.add(grid);

		const axes = new AxesHelper(5);
		this.scene.add(axes);

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
				if (!this.domElement && !this.renderer) {
					return;
				}
				alignCameraToScene(gltf.scene, camera);
				this.scene.add(gltf.scene);
				this.saveCoords(this.lastChild());
				render3d();
			}, console.error);
		}, err => {
			this.setState({ error: err.toString() });
			this.disposeWebGL();
		});

		this.base.appendChild(this.domElement);
	}

	/**
	 * Save original coords and build exploded coords
	 */
	saveCoords(root) {
		const AXIS = 0;

		let previousPos = 0;
		for (const c of root.children) {
			this.originalCoords.push(c.position.clone());

			const bb = new Box3();
			bb.expandByObject(c);
			const dims = new Vector3().subVectors(bb.max, bb.min);
			fixInfinity(dims);

			const pos = c.position.clone();
			pos.setComponent(AXIS,
				dims.getComponent(AXIS)
				+ previousPos
			);
			this.explodedCoords.push(pos);
			previousPos += dims.getComponent(AXIS);
		}
	}

	componentWillUnmount() {
		this.disposeWebGL();
	}

	explode(exploded) {
		const coords = exploded ? this.explodedCoords : this.originalCoords;

		for (let i = 0; i < this.lastChild().children.length; i++) {
			this.lastChild().children[i].position.copy(coords[i].clone());
		}
	}

	render() {
		return (
			<div>
				<h3>{this.props.proto}</h3>
				<div>
					<input type="checkbox" id="explode" name="explode" onInput={e => this.explode(e.target.checked)} />
					<label for="explode">Explode top level nodes</label>
				</div>
				{this.state.error ? <Alert>{this.state.error.toString()}</Alert> : undefined}
			</div>
		);
	}
}


export default ProtoViewer;
