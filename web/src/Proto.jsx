import ProtoViewer from "./components/ProtoViewer";

function Proto(props) {
	const { proto } = props;
	return <div><ProtoViewer proto={proto} /></div>;
}

export default Proto;
