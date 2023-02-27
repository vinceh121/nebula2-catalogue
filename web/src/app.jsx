import WebGL from "three/examples/jsm/capabilities/WebGL";
import { Route } from "wouter";
import './app.css';
import Home from "./Home";
import About from "./About";
import ToolBar from './ToolBar';
import Alert from "./components/Alert";
import Proto from "./Proto";

export function App() {
	return (
		<>
			<ToolBar />

			{
				!WebGL.isWebGLAvailable() ?
					<Alert>This catalogue needs WebGL to render objects, but it doesn't look like your browser has WebGL available.</Alert>
					: undefined
			}

			<div>
				<Route path="/"><Home /></Route>
				<Route path="/about"><About /></Route>
				<Route path="/proto/:proto">{param => <Proto proto={param.proto.endsWith(".n") ? param.proto : param.proto + ".n"} />}</Route>
			</div>
		</>
	)
}
