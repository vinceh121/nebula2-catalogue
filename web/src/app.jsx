import WebGL from "three/examples/jsm/capabilities/WebGL";
import { Route } from "wouter";
import './app.css';
import Home from "./Home";
import About from "./About";
import NoWebGLError from './NoWebGLError';
import ToolBar from './ToolBar';

export function App() {
	return (
		<>
			<ToolBar />

			{!WebGL.isWebGLAvailable() ? <NoWebGLError /> : undefined}

			<div>
				<Route path="/"><Home /></Route>
				<Route path="/about"><About /></Route>
			</div>
		</>
	)
}
