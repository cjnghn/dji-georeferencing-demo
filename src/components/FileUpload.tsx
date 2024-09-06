import React from "react";
import styles from "./FileUpload.module.css";

export const FileUpload: React.FC<{
  id: string;
  label: string;
  accept: string;
  onChange: (file: File) => void;
}> = ({ id, label, accept, onChange }) => (
  <div className={styles.uploadContainer}>
    <label htmlFor={id} className={styles.label}>
      {label}
    </label>
    <input
      type="file"
      id={id}
      accept={accept}
      className={styles.input}
      onChange={(e) => e.target.files && onChange(e.target.files[0])}
    />
  </div>
);
