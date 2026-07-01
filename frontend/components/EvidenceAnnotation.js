import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function EvidenceAnnotation({ imageUrl, reportId, evidenceId, onClose, darkMode = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen, arrow, text, rectangle, circle
  const [color, setColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [annotations, setAnnotations] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load image and existing annotations
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = imageUrl;

    // Load existing annotations
    loadAnnotations();
  }, [imageUrl]);

  const loadAnnotations = async () => {
    try {
      const { data, error } = await supabase
        .from('evidence_annotations')
        .select('*')
        .eq('evidence_id', evidenceId);

      if (error) throw error;
      if (data && data.length > 0) {
        setAnnotations(data[0].annotations || []);
        redrawCanvas(data[0].annotations || []);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  };

  const redrawCanvas = (annotationsList = annotations) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Draw all annotations
    annotationsList.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.lineWidth;

      switch(annotation.tool) {
        case 'pen':
          ctx.beginPath();
          annotation.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
          break;

        case 'arrow':
          drawArrow(ctx, annotation.start.x, annotation.start.y, annotation.end.x, annotation.end.y);
          break;

        case 'rectangle':
          ctx.strokeRect(
            annotation.start.x,
            annotation.start.y,
            annotation.end.x - annotation.start.x,
            annotation.end.y - annotation.start.y
          );
          break;

        case 'circle':
          const radius = Math.sqrt(
            Math.pow(annotation.end.x - annotation.start.x, 2) +
            Math.pow(annotation.end.y - annotation.start.y, 2)
          );
          ctx.beginPath();
          ctx.arc(annotation.start.x, annotation.start.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;

        case 'text':
          ctx.font = `${annotation.fontSize || 16}px Arial`;
          ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
          break;
      }
    });
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  const handleMouseDown = (e) => {
    if (tool === 'text') {
      const rect = canvasRef.current.getBoundingClientRect();
      setTextPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      return;
    }

    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen') {
      setAnnotations([...annotations, {
        tool: 'pen',
        color,
        lineWidth,
        points: [{ x, y }]
      }]);
    } else {
      setAnnotations([...annotations, {
        tool,
        color,
        lineWidth,
        start: { x, y },
        end: { x, y }
      }]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newAnnotations = [...annotations];
    const currentAnnotation = newAnnotations[newAnnotations.length - 1];

    if (tool === 'pen') {
      currentAnnotation.points.push({ x, y });
    } else {
      currentAnnotation.end = { x, y };
    }

    setAnnotations(newAnnotations);
    redrawCanvas(newAnnotations);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleAddText = () => {
    if (!textInput.trim() || !textPosition) return;

    const newAnnotations = [...annotations, {
      tool: 'text',
      color,
      text: textInput,
      position: textPosition,
      fontSize: 16
    }];

    setAnnotations(newAnnotations);
    redrawCanvas(newAnnotations);
    setTextInput('');
    setTextPosition(null);
  };

  const handleUndo = () => {
    const newAnnotations = annotations.slice(0, -1);
    setAnnotations(newAnnotations);
    redrawCanvas(newAnnotations);
  };

  const handleClear = () => {
    setAnnotations([]);
    redrawCanvas([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save annotations to database
      const { error } = await supabase
        .from('evidence_annotations')
        .upsert([{
          evidence_id: evidenceId,
          report_id: reportId,
          annotations: annotations,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'evidence_id'
        });

      if (error) throw error;

      // Also save the annotated image as a new file
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        const fileName = `annotated-${evidenceId}-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidence-files')
          .upload(`${reportId}/${fileName}`, file);

        if (uploadError) throw uploadError;

        alert('✅ Annotations saved successfully!');
        onClose && onClose();
      }, 'image/jpeg', 0.95);

    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      padding: 20
    }}>
      {/* Toolbar */}
      <div style={{
        background: darkMode ? '#1e293b' : 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setTool('pen')}
            style={{
              padding: '8px 16px',
              background: tool === 'pen' ? '#2563eb' : '#e5e7eb',
              color: tool === 'pen' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool('arrow')}
            style={{
              padding: '8px 16px',
              background: tool === 'arrow' ? '#2563eb' : '#e5e7eb',
              color: tool === 'arrow' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ➡️ Arrow
          </button>
          <button
            onClick={() => setTool('rectangle')}
            style={{
              padding: '8px 16px',
              background: tool === 'rectangle' ? '#2563eb' : '#e5e7eb',
              color: tool === 'rectangle' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ◻️ Box
          </button>
          <button
            onClick={() => setTool('circle')}
            style={{
              padding: '8px 16px',
              background: tool === 'circle' ? '#2563eb' : '#e5e7eb',
              color: tool === 'circle' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ⭕ Circle
          </button>
          <button
            onClick={() => setTool('text')}
            style={{
              padding: '8px 16px',
              background: tool === 'text' ? '#2563eb' : '#e5e7eb',
              color: tool === 'text' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            📝 Text
          </button>
        </div>

        {/* Color picker */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Color:</label>
          {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 32,
                height: 32,
                background: c,
                border: color === c ? '3px solid #2563eb' : '2px solid #ccc',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        {/* Line width */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Size:</label>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ fontSize: '0.875rem' }}>{lineWidth}px</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: annotations.length === 0 ? 0.5 : 1
            }}
          >
            ↶ Undo
          </button>
          <button
            onClick={handleClear}
            disabled={annotations.length === 0}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: annotations.length === 0 ? 0.5 : 1
            }}
          >
            🗑️ Clear
          </button>
          <button
            onClick={handleSave}
            disabled={saving || annotations.length === 0}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving || annotations.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: saving || annotations.length === 0 ? 0.5 : 1
            }}
          >
            {saving ? '💾 Saving...' : '💾 Save'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Text input modal */}
      {textPosition && (
        <div style={{
          position: 'absolute',
          left: textPosition.x,
          top: textPosition.y + 100,
          background: 'white',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10001
        }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text..."
            style={{
              padding: '8px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: 6,
              marginRight: 8,
              width: 200
            }}
            autoFocus
          />
          <button
            onClick={handleAddText}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Add
          </button>
          <button
            onClick={() => setTextPosition(null)}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              marginLeft: 8
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Canvas */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto'
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            cursor: tool === 'text' ? 'text' : 'crosshair',
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        />
      </div>
    </div>
  );
}
