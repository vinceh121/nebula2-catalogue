import { Component } from "preact";
import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AmbientLight, GridHelper } from "three";


class ProtoPreview extends Component {
	domElement;

	constructor(props, ctx) {
		super(props, ctx);
		const { proto } = props;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer();
		renderer.setSize(500, 500);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;
		renderer.outputEncoding = THREE.sRGBEncoding;

		const render3d = () => {
			renderer.render(scene, camera);
		};

		const ambLight = new AmbientLight(0xffffff, 0.8);
		scene.add(ambLight);

		const grid = new GridHelper(2000, 20, 0x888888, 0x444444);
		scene.add(grid);

		const axes = new THREE.AxesHelper( 500 );
		scene.add(axes);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.addEventListener("change", render3d);
		orbit.minDistance = 2;
		orbit.maxDistance = 300;
		orbit.target.set(0, 0, 0);
		orbit.update();

		this.domElement = renderer.domElement;

		const loader = new GLTFLoader();
		loader.load(`/assets/${proto}`, gltf => {
			scene.add(gltf.scene);
			console.log(gltf);
			render3d();
		}, console.error);
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


export default ProtoPreview;
