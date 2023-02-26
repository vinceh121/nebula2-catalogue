import { useEffect, useState } from 'preact/hooks';
import Alert from './components/Alert';
import Card from './components/Card';
import Loader from "./Loader";
import ProtoPreview from "./ProtoPreview";

function Home() {
	const [assets, setAssets] = useState();
	const [error, setError] = useState();

	useEffect(() => {
		if (!assets) {
			fetch("/assets/assets.json")
				.then(res => {
					if (res.ok) {
						res.json().then(setAssets);
					} else {
						res.text().then(txt => setError(`${res.status} ${res.statusText}: ${txt}`));
					}
				});
		}
	}, [assets, setAssets, error, setError]);

	if (error) {
		return <Alert>Failed to fetch assets manifest: {error}</Alert>
	}

	if (!assets) {
		return <Loader />
	}

	return <div>
		{assets.map(a => <Card title={a.name} style={{ display: "flex", flexWrap: "wrap-reverse" }}><ProtoPreview key={a.name} proto={a.name} /></Card>)}
	</div>;
}

export default Home;