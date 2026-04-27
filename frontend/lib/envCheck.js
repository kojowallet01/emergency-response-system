// Check required environment variables
export const checkEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const optional = [
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_OPENAI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  const missingOptional = optional.filter(key => !process.env[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
    missingOptional,
    warnings: missingOptional.map(key => {
      if (key === 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY') {
        return 'Maps features will be limited without Google Maps API key';
      }
      if (key === 'NEXT_PUBLIC_OPENAI_API_KEY') {
        return 'AI classification features will be disabled without OpenAI API key';
      }
      return `${key} is not configured`;
    })
  };
};

// Get environment status for display
export const getEnvironmentStatus = () => {
  const check = checkEnvironment();
  
  return {
    ...check,
    supabase: {
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'
    },
    googleMaps: {
      configured: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      status: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Configured' : '⚠️ Optional'
    },
    openAI: {
      configured: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      status: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? '✅ Configured' : '⚠️ Optional'
    }
  };
};

// Display environment warnings in console
export const logEnvironmentWarnings = () => {
  const check = checkEnvironment();
  
  if (!check.isValid) {
    console.error('❌ Missing required environment variables:', check.missing);
  }
  
  if (check.missingOptional.length > 0) {
    console.warn('⚠️ Optional environment variables not configured:');
    check.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  if (check.isValid && check.missingOptional.length === 0) {
    console.log('✅ All environment variables configured');
  }
};
