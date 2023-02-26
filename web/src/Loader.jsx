import "./Loader.css";

function Loader(props) {
	const { width, height } = props;
	return <span style={{
		width: width ? width + "px" : undefined,
		height: height ? height + "px" : undefined
	}}
		className="loader" {...props}></span>
}

export default Loader;
