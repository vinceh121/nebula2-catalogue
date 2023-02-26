import { Component } from "preact";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AmbientLight, AxesHelper, DirectionalLight, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { createRef } from "preact";
import Loader from "./Loader";


const canvasWidth = 300;
const canvasHeight = 300;

class ProtoViewer extends Component {
	ref = createRef();
	proto;
	domElement;

	constructor(props, ctx) {
		super(props, ctx);
		const { proto } = props;
		this.proto = proto;
		this.state = { inView: false };
	}

	buildWebGL() {
		const scene = new Scene();
		const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
		camera.position.set(50, 50, 50);

		const renderer = new WebGLRenderer();
		renderer.setSize(canvasWidth, canvasHeight);

		const render3d = () => {
			renderer.render(scene, camera);
		};

		const ambLight = new AmbientLight(0xffffff, 0.6);
		ambLight.position.set(0, 1, 0);
		scene.add(ambLight);

		const dirLight = new DirectionalLight(0xffffff, 1);
		dirLight.position.set(1, 1, 1).normalize();
		scene.add(dirLight);

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

	handleScroll(event) {
		const winHeight = window.innerHeight;
		const scrollY = window.scrollY;
		const scrollMaxY = scrollY + winHeight;
		const elemY = this.ref.current.getBoundingClientRect().top;
		const elemMaxY = this.ref.current.getBoundingClientRect().bottom;

		const inView = (elemY >= 0 && elemY <= scrollMaxY) && (elemMaxY >= 0 && elemMaxY <= scrollMaxY);
		this.state = { inView };
	}

	componentDidMount() {
		window.addEventListener("scroll", (e) => this.handleScroll(e));
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", (e) => this.handleScroll(e));
	}

	render() {
		return (
			<div ref={this.ref}>
				{
					this.state.inView ?
						<>owo</>// this.base.appendChild(this.domElement)
						: <div width={canvasWidth} hight={canvasHeight}><Loader /></div>
				}
			</div>
		);
	}
}


export default ProtoViewer;
