function Card(props) {
	const { title, children } = props;

	return <div {...props}>
		{children}
		{title ? <h3>{title}</h3> : undefined}
	</div>
}

export default Card;
