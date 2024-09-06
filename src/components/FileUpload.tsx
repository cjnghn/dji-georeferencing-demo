import React from "react";

export const FileUpload: React.FC<{
	id: string;
	label: string;
	accept: string;
	onChange: (file: File) => void;
}> = ({ id, label, accept, onChange }) => (
	<div>
		<label htmlFor={id}>{label}</label>
		<input
			type="file"
			id={id}
			accept={accept}
			onChange={(e) => e.target.files && onChange(e.target.files[0])}
		/>
	</div>
);
