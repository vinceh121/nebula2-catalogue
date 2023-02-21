import { Link } from "wouter";
import "./ToolBar.css";

function BarItem({href, children}) {
	return (
		<Link className="baritem" href={href}>{children}</Link>
	);
}

function ToolBar() {
	return (
		<header className="toolbar">
			<h3><BarItem href="/">Nebula2 Catalogue</BarItem></h3>
			<BarItem href="/about">About</BarItem>
		</header>
	);
}

export default ToolBar;
