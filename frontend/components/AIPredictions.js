import { useState, useEffect } from 'react';
import { classifyEmergency, findSimilarIncidents, suggestResponder, recordCorrection } from '../lib/aiClassification';

export default function AIPredictions({ report, onClose, darkMode = false }) {
  const [loading, setLoading] = useState(true);
  const [classification, setClassification] = useState(null);
  const [similarIncidents, setSimilarIncidents] = useState([]);
  const [suggestedResponder, setSuggestedResponder] = useState(null);
  const [tab, setTab] = useState('classification'); // classification, similar, responder

  useEffect(() => {
    loadAIPredictions();
  }, [report.id]);

  const loadAIPredictions = async () => {
    setLoading(true);
    try {
      // Run all AI functions in parallel
      const [classResult, similarResult, responderResult] = await Promise.all([
        classifyEmergency(report),
        findSimilarIncidents(report),
        suggestResponder(report)
      ]);

      setClassification(classResult);
      setSimilarIncidents(similarResult || []);
      setSuggestedResponder(responderResult);
    } catch (error) {
      console.error('Error loading AI predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrection = async (correctedType) => {
    if (classification) {
      await recordCorrection(report.id, classification.confirmedType, correctedType);
      alert('✅ Correction recorded. AI will learn from this!');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      1: '#10b981',
      2: '#84cc16',
      3: '#f59e0b',
      4: '#f97316',
      5: '#ef4444'
    };
    return colors[severity] || '#6b7280';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444'
    };
    return colors[urgency] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div style={{
          background: darkMode ? '#1e293b' : 'white',
          padding: 40,
          borderRadius: 16,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤖</div>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            AI is analyzing the emergency...
          </p>
          <div style={{
            marginTop: 20,
            width: 200,
            height: 4,
            background: '#e5e7eb',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: '#2563eb',
              animation: 'loading 1.5s ease-in-out infinite',
              width: '50%'
            }} />
          </div>
        </div>
        <style jsx>{`
          @keyframes loading {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (!classification) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div style={{
          background: darkMode ? '#1e293b' : 'white',
          padding: 40,
          borderRadius: 16,
          textAlign: 'center',
          maxWidth: 400
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <p style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600 }}>
            AI Classification Unavailable
          </p>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#6b7280' }}>
            OpenAI API key not configured or service unavailable.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 20
    }}>
      <div style={{
        background: darkMode ? '#1e293b' : 'white',
        borderRadius: 16,
        maxWidth: 800,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: 20,
          borderBottom: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>🤖</span>
            AI Analysis
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '0 20px',
          borderBottom: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`
        }}>
          <button
            onClick={() => setTab('classification')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'classification' ? '3px solid #2563eb' : 'none',
              color: tab === 'classification' ? '#2563eb' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Classification
          </button>
          <button
            onClick={() => setTab('similar')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'similar' ? '3px solid #2563eb' : 'none',
              color: tab === 'similar' ? '#2563eb' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Similar Incidents ({similarIncidents.length})
          </button>
          <button
            onClick={() => setTab('responder')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'responder' ? '3px solid #2563eb' : 'none',
              color: tab === 'responder' ? '#2563eb' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Suggested Responder
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tab === 'classification' && (
            <div>
              {/* Classification Card */}
              <div style={{
                background: darkMode ? '#0f172a' : '#f9fafb',
                padding: 20,
                borderRadius: 12,
                marginBottom: 20
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                      CONFIRMED TYPE
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, textTransform: 'capitalize' }}>
                      {classification.confirmedType}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                      CONFIDENCE
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                      {classification.confidence}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                      SEVERITY
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: getSeverityColor(classification.severity)
                      }}>
                        {classification.severity}/5
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            background: i <= classification.severity ? getSeverityColor(classification.severity) : '#e5e7eb'
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                      URGENCY
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: getUrgencyColor(classification.urgency),
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {classification.urgency}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600 }}>
                  AI Summary
                </h3>
                <p style={{
                  margin: 0,
                  padding: 16,
                  background: darkMode ? '#0f172a' : '#f9fafb',
                  borderRadius: 8,
                  lineHeight: 1.6,
                  fontSize: '0.875rem'
                }}>
                  {classification.aiSummary}
                </p>
              </div>

              {/* Required Resources */}
              {classification.requiredResources?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600 }}>
                    Required Resources
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {classification.requiredResources.map((resource, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {resource}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {classification.recommendations?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600 }}>
                    AI Recommendations
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {classification.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Correction Buttons */}
              {classification.confirmedType !== report.type && (
                <div style={{
                  marginTop: 20,
                  padding: 16,
                  background: '#fef3c7',
                  borderRadius: 8
                }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
                    ⚠️ AI suggests different type than reported
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleCorrection(report.type)}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      Keep Original ({report.type})
                    </button>
                    <button
                      onClick={() => handleCorrection(classification.confirmedType)}
                      style={{
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      Use AI Suggestion ({classification.confirmedType})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'similar' && (
            <div>
              {similarIncidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
                  <p>No similar incidents found</p>
                </div>
              ) : (
                similarIncidents.map((incident, idx) => (
                  <div key={incident.id} style={{
                    padding: 16,
                    background: darkMode ? '#0f172a' : '#f9fafb',
                    borderRadius: 8,
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {incident.type} Emergency
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        background: incident.similarity >= 70 ? '#dcfce7' : '#fef3c7',
                        color: incident.similarity >= 70 ? '#166534' : '#92400e',
                        borderRadius: 4,
                        fontWeight: 600
                      }}>
                        {incident.similarity}% match
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 8 }}>
                      {incident.description || 'No description'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      📍 {incident.latitude.toFixed(4)}°, {incident.longitude.toFixed(4)}° •{' '}
                      {new Date(incident.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'responder' && (
            <div>
              {!suggestedResponder ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚑</div>
                  <p>No available responders found</p>
                </div>
              ) : (
                <div style={{
                  padding: 20,
                  background: darkMode ? '#0f172a' : '#f9fafb',
                  borderRadius: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#2563eb',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem'
                    }}>
                      🚑
                    </div>
                    <div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>
                        {suggestedResponder.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {suggestedResponder.responder_id} • {suggestedResponder.type.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                        DISTANCE
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {suggestedResponder.distance.toFixed(1)} km
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                        ESTIMATED ETA
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {suggestedResponder.eta} min
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                      CONTACT
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {suggestedResponder.phone_number || 'No phone number'}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
                      LAST LOCATION UPDATE
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {new Date(suggestedResponder.location.updated_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Assign Responder
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
