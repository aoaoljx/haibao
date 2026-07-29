interface ExportPreviewProps {
  url: string;
  filename: string;
  onClose: () => void;
}

export function ExportPreview({ url, filename, onClose }: ExportPreviewProps) {
  return (
    <div id="exportPreview" className="export-preview">
      <div className="section-title">
        <h2>导出图片</h2>
        <button id="closeExportPreview" type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      <p>如果浏览器没有自动下载，可以在下方图片上右键另存为 PNG。</p>
      <a id="exportDownloadLink" className="download-link" href={url} download={filename}>
        下载 PNG
      </a>
      <img id="exportImage" src={url} alt="导出的海报 PNG" />
    </div>
  );
}
