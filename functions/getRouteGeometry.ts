import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coordinates } = await req.json();
    
    if (!coordinates || coordinates.length < 2) {
      return Response.json({ error: 'At least 2 coordinates required' }, { status: 400 });
    }

    const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
    if (!MAPBOX_TOKEN) {
      return Response.json({ error: 'MAPBOX_TOKEN not configured' }, { status: 500 });
    }

    // Build coordinates string: lng,lat;lng,lat
    const coordsStr = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      return Response.json({ error: 'No route found' }, { status: 404 });
    }

    const route = data.routes[0];
    
    return Response.json({
      geometry: route.geometry.coordinates,
      distance_meters: route.distance,
      duration_seconds: route.duration,
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});