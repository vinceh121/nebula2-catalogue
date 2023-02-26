import "./Alert.css";

function Alert(props) {
	const { children, width, height } = props;
	return <div className="alert" style={{
		width: width ? width + "px" : undefined,
		height: height ? height + "px" : undefined
	}} {...props}>{children}</div>
}

export default Alert;
