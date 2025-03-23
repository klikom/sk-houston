/**
 * SK Houston Constructions - Trello API Worker
 * This worker securely handles form submissions and forwards them to Trello
 */

// Configuration is stored in environment variables in the Cloudflare Dashboard
// TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_LIST_ID, etc.

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Get the origin from the request
  const origin = request.headers.get('Origin') || '';
  
  // Set up CORS headers with proper localhost handling
  const corsHeaders = {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const formData = await request.json();
    
    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phone', 'service', 'message'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Missing required field: ${field}`
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    // Get the page URL where the form was submitted
    const pageUrl = request.headers.get('Referer') || 'Direct submission';

    // Extract the article name from the URL or form data
    let articleName = '';
    try {
      // First priority: use the article name provided in form data
      if (formData.articleName && formData.articleName !== 'homepage') {
        articleName = formData.articleName;
      } 
      // Second priority: extract from the referer URL
      else if (pageUrl !== 'Direct submission') {
        const url = new URL(pageUrl);
        const cleanPath = url.pathname.replace(/^\/|\/$/g, '').split('/')[0];
        
        if (cleanPath) {
          articleName = cleanPath;
        }
      }
      
      // If we still don't have an article name, use a default
      if (!articleName) {
        articleName = 'Unknown article';
      }
      
      // Add local testing note if applicable (but keep the original article name)
      if ((origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) ||
          (pageUrl !== 'Direct submission' && pageUrl.includes('localhost'))) {
        articleName += ' (local testing)';
      }
    } catch (error) {
      console.error('Error parsing article name:', error);
      articleName = 'Article name error';
    }

    // Create card in Trello
    const cardName = `${formData.fullName} - ${formData.service}`;
    const cardDesc = `Form Submission from: ${articleName}\n` +
      `Submission URL: ${pageUrl}\n\n` +
      `Name: ${formData.fullName}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone}\n` +
      `Service: ${formData.service}\n` +
      `Consultation Date: ${formData.consultationDate}\n` +
      `Arrival Window: ${formData.arrivalWindow}\n` +
      `Address: ${formData.address || 'Not provided'}\n\n` +
      `Message:\n${formData.message}`;

    console.log('Creating Trello card:', { cardName, cardDesc, articleName });

    // Log environment variables (for debugging)
    console.log('Environment:', {
      listId: TRELLO_LIST_ID,
      apiKey: TRELLO_API_KEY,
      hasToken: !!TRELLO_TOKEN
    });

    const trelloUrl = new URL('https://api.trello.com/1/cards');
    trelloUrl.searchParams.append('idList', TRELLO_LIST_ID);
    trelloUrl.searchParams.append('key', TRELLO_API_KEY);
    trelloUrl.searchParams.append('token', TRELLO_TOKEN);
    trelloUrl.searchParams.append('name', cardName);
    trelloUrl.searchParams.append('desc', cardDesc);
    trelloUrl.searchParams.append('pos', 'top');

    const response = await fetch(trelloUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Trello API error:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create Trello card: ${response.status}`,
          details: errorData
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

/**
 * Determine if the origin is allowed to access this worker
 * @param {string} origin - The Origin header from the request
 * @returns {string} - The allowed origin or '*' as fallback
 */
function getAllowedOrigin(origin) {
  // Allow localhost during development
  if (origin && (
    origin.startsWith('http://localhost:') || 
    origin.startsWith('http://127.0.0.1:')
  )) {
    return origin;
  }

  // Production domain
  if (origin === 'https://lp.skhoustonconstructions.com') {
    return origin;
  }

  // Default to production domain if no match
  return 'https://lp.skhoustonconstructions.com';
} 