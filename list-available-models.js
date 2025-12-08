const apiKey = "AIzaSyD35yMhavZo3vynqVAtEk4bERBujjSvWiw";

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to fetch models:", response.status, error);
      return;
    }
    
    const data = await response.json();
    console.log("✅ Successfully fetched models");
    console.log("Total models:", data.models?.length || 0);
    console.log("");
    console.log("=== MODELS SUPPORTING generateContent ===");
    
    const generateContentModels = data.models?.filter(model => 
      model.supportedGenerationMethods?.includes("generateContent")
    ) || [];
    
    console.log("Count:", generateContentModels.length);
    console.log("");
    
    generateContentModels.forEach(model => {
      console.log(`📦 ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Version: ${model.version || 'latest'}`);
      console.log("");
    });
    
    if (generateContentModels.length === 0) {
      console.log("❌ No models found that support generateContent!");
      console.log("All models:", JSON.stringify(data.models?.map(m => m.name), null, 2));
    }
    
  } catch (error) {
    console.error("Network error:", error.message);
  }
}

listModels();
