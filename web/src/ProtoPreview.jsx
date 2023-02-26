import { Component } from "preact";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AmbientLight, AxesHelper, DirectionalLight, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { createRef } from "preact";
import Loader from "./Loader";
import Alert from "./components/Alert";


const canvasWidth = 300;
const canvasHeight = 300;

class ProtoViewer extends Component {
	ref = createRef();
	intersectionObserver = new IntersectionObserver(e => this.handleScroll(e));
	renderer;
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
		camera.position.set(50, 70, 50);
		camera.lookAt(0, 0, 0);

		this.renderer = new WebGLRenderer();
		this.renderer.setSize(canvasWidth, canvasHeight);

		const render3d = () => {
			this.renderer.render(scene, camera);
		};

		const ambLight = new AmbientLight(0xffffff, 0.6);
		ambLight.position.set(0, 1, 0);
		scene.add(ambLight);

		const dirLight = new DirectionalLight(0xffffff, 1);
		dirLight.position.set(1, 1, 1).normalize();
		scene.add(dirLight);

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
			if (data.materials) {
				data.extensionsUsed = ["KHR_materials_unlit"];

				for (const mat of data.materials) {
					mat.extensions = { "KHR_materials_unlit": {} };
				}
			}

			loader.parse(data, "/assets/", gltf => {
				scene.add(gltf.scene);
				render3d();
			}, console.error);
		}, err => {
			this.setState({ error: err.toString() });
			this.disposeWebGL();
		});
	}

	handleScroll(entries) {
		const inView = entries[0].intersectionRatio > 0;
		if (inView) {
			if (!this.domElement) {
				this.buildWebGL();
				this.base.appendChild(this.domElement);
			} else {
				this.base.appendChild(this.domElement);
			}
		}
		if (!inView && this.domElement && Array.from(this.base.children).includes(this.domElement)) {
			this.disposeWebGL();
		}
		if (inView != this.state.inView) {
			this.setState({ inView });
		}
	}

	disposeWebGL() {
		if (this.domElement) {
			this.base.removeChild(this.domElement);
		}
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		this.domElement = undefined;
	}

	componentDidMount() {
		this.intersectionObserver.observe(this.base);
	}

	componentWillUnmount() {
		this.intersectionObserver.unobserve(this.base);
		this.renderer.dispose();
	}

	render() {
		return (
			<div width={canvasWidth} height={canvasHeight} style={{ width: canvasWidth + "px", height: canvasHeight + "px" }} ref={this.ref}>
				{this.state.error ? <Alert>{this.state.error}</Alert> : undefined}
				{
					this.state.error || (this.state.inView && this.domElement) ?
						undefined
						: <Loader width={canvasWidth} height={canvasHeight} />
				}
			</div>
		);
	}
}


export default ProtoViewer;
