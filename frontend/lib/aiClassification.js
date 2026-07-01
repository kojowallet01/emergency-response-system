// AI-Powered Emergency Classification using OpenAI

import { supabase } from './supabase';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Classify emergency using AI
 * @param {Object} report - Report data
 * @returns {Object} Classification result
 */
export const classifyEmergency = async (report) => {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API key not configured');
    return null;
  }

  try {
    const prompt = buildClassificationPrompt(report);
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency response AI assistant. Analyze emergency reports and provide accurate classifications. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse AI response
    const classification = parseAIResponse(aiResponse);
    
    // Save to database
    await saveClassification(report.id, classification);
    
    return classification;
  } catch (error) {
    console.error('❌ AI Classification error:', error);
    return null;
  }
};

/**
 * Build classification prompt
 */
const buildClassificationPrompt = (report) => {
  return `
Analyze this emergency report and provide a classification:

REPORT DETAILS:
- Type: ${report.type}
- Description: ${report.description || 'No description provided'}
- Location: ${report.latitude}, ${report.longitude}
- Has Voice: ${report.voice_url ? 'Yes' : 'No'}
- Has Media: ${report.media_count > 0 ? `Yes (${report.media_count} files)` : 'No'}
- Submitted: ${new Date(report.created_at).toLocaleString()}

Provide a JSON response with:
{
  "confirmedType": "fire|medical|crime",
  "severity": 1-5 (1=minor, 5=critical),
  "confidence": 0-100 (percentage),
  "urgency": "low|medium|high|critical",
  "estimatedResponseTime": minutes,
  "requiredResources": ["resource1", "resource2"],
  "aiSummary": "Brief 2-sentence summary",
  "keywords": ["keyword1", "keyword2"],
  "recommendations": ["action1", "action2"]
}

Be realistic and cautious. If unsure, lower confidence and recommend human review.
`.trim();
};

/**
 * Parse AI response
 */
const parseAIResponse = (response) => {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback parsing
    return {
      confirmedType: 'unknown',
      severity: 3,
      confidence: 50,
      urgency: 'medium',
      estimatedResponseTime: 10,
      requiredResources: [],
      aiSummary: response.substring(0, 200),
      keywords: [],
      recommendations: ['Verify with manual review']
    };
  } catch (error) {
    console.error('❌ Error parsing AI response:', error);
    return null;
  }
};

/**
 * Save classification to database
 */
const saveClassification = async (reportId, classification) => {
  try {
    const { error } = await supabase
      .from('ai_predictions')
      .upsert([{
        report_id: reportId,
        predicted_type: classification.confirmedType,
        severity_score: classification.severity,
        confidence_score: classification.confidence,
        urgency_level: classification.urgency,
        estimated_response_time: classification.estimatedResponseTime,
        required_resources: classification.requiredResources,
        ai_summary: classification.aiSummary,
        keywords: classification.keywords,
        recommendations: classification.recommendations,
        model_version: 'gpt-3.5-turbo',
        created_at: new Date().toISOString()
      }], {
        onConflict: 'report_id'
      });

    if (error) throw error;
    console.log('✅ Classification saved to database');
  } catch (error) {
    console.error('❌ Error saving classification:', error);
  }
};

/**
 * Find similar incidents
 */
export const findSimilarIncidents = async (report, limit = 5) => {
  try {
    // Get AI keywords for the report
    const classification = await classifyEmergency(report);
    if (!classification || !classification.keywords) return [];

    // Search for similar reports based on keywords and type
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('type', report.type)
      .neq('id', report.id)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter by similarity

    if (error) throw error;

    // Score similarity based on keywords, location, and time
    const scoredReports = data.map(r => ({
      ...r,
      similarity: calculateSimilarity(report, r, classification.keywords)
    }));

    // Sort by similarity and return top matches
    return scoredReports
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

  } catch (error) {
    console.error('❌ Error finding similar incidents:', error);
    return [];
  }
};

/**
 * Calculate similarity score
 */
const calculateSimilarity = (report1, report2, keywords) => {
  let score = 0;

  // Same type: +30 points
  if (report1.type === report2.type) score += 30;

  // Location proximity (within 5km): +40 points
  const distance = calculateDistance(
    report1.latitude,
    report1.longitude,
    report2.latitude,
    report2.longitude
  );
  if (distance < 5) score += 40 - (distance * 5);

  // Recent (within 7 days): +20 points
  const daysDiff = Math.abs(
    new Date(report1.created_at) - new Date(report2.created_at)
  ) / (1000 * 60 * 60 * 24);
  if (daysDiff < 7) score += 20 - (daysDiff * 2);

  // Keyword match in description: +10 points
  const desc2 = (report2.description || '').toLowerCase();
  const matchedKeywords = keywords.filter(k => 
    desc2.includes(k.toLowerCase())
  );
  score += matchedKeywords.length * 5;

  return Math.min(100, Math.max(0, score));
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Suggest nearest available responder
 */
export const suggestResponder = async (report) => {
  try {
    // Get all available responders of the correct type
    const typeMap = {
      fire: ['FIRE001', 'FIRE002'],
      medical: ['MED001', 'MED002'],
      crime: ['POLICE001', 'POLICE002']
    };

    const responderIds = typeMap[report.type] || [];
    
    const { data, error } = await supabase
      .from('responders')
      .select('*')
      .in('responder_id', responderIds)
      .eq('status', 'available')
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Get last known locations
    const respondersWithLocation = await Promise.all(
      data.map(async (responder) => {
        const { data: locationData } = await supabase
          .from('responder_locations')
          .select('*')
          .eq('responder_id', responder.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (!locationData) return null;

        const distance = calculateDistance(
          report.latitude,
          report.longitude,
          locationData.latitude,
          locationData.longitude
        );

        return {
          ...responder,
          location: locationData,
          distance,
          eta: Math.round((distance / 60) * 60) // Assume 60km/h average speed
        };
      })
    );

    // Filter out nulls and sort by distance
    const validResponders = respondersWithLocation
      .filter(r => r !== null)
      .sort((a, b) => a.distance - b.distance);

    return validResponders[0] || null;

  } catch (error) {
    console.error('❌ Error suggesting responder:', error);
    return null;
  }
};

/**
 * Learn from admin corrections
 */
export const recordCorrection = async (reportId, aiPrediction, adminChoice) => {
  try {
    // Update AI prediction with correction
    const { error } = await supabase
      .from('ai_predictions')
      .update({
        was_corrected: true,
        admin_correction: adminChoice,
        corrected_at: new Date().toISOString()
      })
      .eq('report_id', reportId);

    if (error) throw error;

    console.log('✅ Correction recorded for learning');
    
    // In future: Use corrections to fine-tune the model
    // For now: Store for analysis
  } catch (error) {
    console.error('❌ Error recording correction:', error);
  }
};

/**
 * Get AI statistics
 */
export const getAIStats = async () => {
  try {
    const { data, error } = await supabase
      .from('ai_predictions')
      .select('*');

    if (error) throw error;

    const total = data.length;
    const corrected = data.filter(p => p.was_corrected).length;
    const accuracy = total > 0 ? ((total - corrected) / total * 100).toFixed(1) : 0;

    const avgConfidence = data.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / total || 0;

    return {
      total,
      corrected,
      accuracy: parseFloat(accuracy),
      avgConfidence: avgConfidence.toFixed(1)
    };
  } catch (error) {
    console.error('❌ Error getting AI stats:', error);
    return null;
  }
};
