interface FeaturePointListProps {
  points: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

export function FeaturePointList({
  points,
  onAdd,
  onUpdate,
  onRemove
}: FeaturePointListProps) {
  return (
    <div className="feature-point-block" id="featurePointEditor">
      <div className="section-title">
        <h2>功能点</h2>
        <button id="addPointBtn" type="button" onClick={onAdd}>
          添加
        </button>
      </div>
      <div id="featurePoints">
        {points.map((point, index) => (
          <div className="point-row" key={`${index}-${point.slice(0, 8)}`}>
            <label>
              {`功能点 ${index + 1}`}
              <input value={point} onChange={(event) => onUpdate(index, event.target.value)} />
            </label>
            <button
              className="remove-point"
              type="button"
              aria-label={`删除功能点 ${index + 1}`}
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
