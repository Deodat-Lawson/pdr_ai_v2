import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";

const agentTools = [new TavilySearchResults({ maxResults: 5 })];
const agentModel = new ChatOpenAI({ temperature: 0 });

const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

// Define schemas for structured outputs
const RepairGuideSchema = z.object({
  title: z.string().describe("Title of the repair guide"),
  url: z.string().describe("URL of the repair guide"),
  summary: z.string().describe("Brief summary of what the guide covers"),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced", "Unknown"]).describe("Difficulty level of the repair"),
  estimatedTime: z.string().optional().describe("Estimated time to complete the repair")
});

const RepairGuidesArraySchema = z.array(RepairGuideSchema).describe("Array of repair guides found for the device");

const StructuredRepairGuidesOutputSchema = z.object({
  repairGuides: RepairGuidesArraySchema.describe("The list of relevant repair guides")
});

const searchRepairGuides = tool(
  async ({ deviceName, issueType }: { deviceName: string; issueType?: string }) => {
    const retriever = new TavilySearchAPIRetriever({ k: 10 });
    
    // Construct search query with repair-specific terms
    let query = `${deviceName} repair guide tutorial how to fix`;
    if (issueType) {
      query += ` ${issueType}`;
    }
    
    // Add terms to find quality repair resources
    query += ` site:ifixit.com OR site:youtube.com OR site:instructables.com OR repair manual`;

    console.log("Searching for:", query);

    const docsWithMetadata = await retriever.getRelevantDocuments(query);
    if (!docsWithMetadata?.length) {
      throw new Error(`No repair guides found for ${deviceName}${issueType ? ` with issue: ${issueType}` : ''}.`);
    }

    // Filter and rank the results
    const repairSites = await filterRepairSites.invoke({ 
      links: docsWithMetadata.map(doc => ({
        url: doc.metadata.source as string,
        title: doc.metadata.title as string || "Unknown Title",
        snippet: doc.pageContent
      }))
    });

    return repairSites;
  },
  {
    name: "search_repair_guides",
    description: "Searches for repair guides and documentation for a specific device",
    schema: z.object({
      deviceName: z.string().describe("The name/model of the device to repair"),
      issueType: z.string().optional().describe("Specific issue or repair type (optional)"),
    }),
  }
);

const filterRepairSites = tool(
  async ({ links }: { links: Array<{ url: string; title: string; snippet: string }> }) => {
    const llm = new ChatOpenAI({ temperature: 0 });
    const structuredLlm = llm.withStructuredOutput(StructuredRepairGuidesOutputSchema);
    
    const prompt = `
    You are a repair guide curator. I will give you a list of URLs, titles, and snippets related to device repair.
    Your job is to:
    1. Filter out low-quality sources (spam, unrelated content, broken links)
    2. Prioritize high-quality repair resources like iFixit, manufacturer manuals, detailed YouTube tutorials, etc.
    3. Extract relevant information for each guide including title, URL, summary, difficulty level, and estimated time
    4. Return a structured list of the best repair guides

    Prioritize sources in this order:
    1. Official manufacturer repair guides
    2. iFixit guides
    3. Detailed YouTube repair tutorials
    4. Instructables or similar DIY sites
    5. Reputable tech repair websites
    6. Community forums with detailed solutions

    For each guide, provide:
    - title: Clear, descriptive title
    - url: The direct URL
    - summary: 2-3 sentence summary of what the guide covers
    - difficulty: Beginner/Intermediate/Advanced/Unknown based on the content
    - estimatedTime: If mentioned in the content (optional)

    Here are the links to evaluate:
    ${links.map((link, i) => `
    ${i + 1}. URL: ${link.url}
       Title: ${link.title}
       Snippet: ${link.snippet}
    `).join('\n')}

    Return the top 5-8 most relevant and high-quality repair guides.
    `;
    
    const output = await structuredLlm.invoke([{ role: 'user', content: prompt }]);
    return output.repairGuides;
  },
  {
    name: "filter_repair_sites",
    description: "Filters and ranks repair guide URLs based on quality and relevance",
    schema: z.object({
      links: z.array(z.object({
        url: z.string(),
        title: z.string(),
        snippet: z.string()
      })).describe("Array of link objects with URL, title, and snippet"),
    }),
  }
);

const getDetailedGuideInfo = tool(
  async ({ url }: { url: string }) => {
    try {
      const loader = new CheerioWebBaseLoader(url);
      const loadedDocs = await loader.load();
      
      const content = loadedDocs
        .map(d => d.pageContent.replace(/\s{2,}/g, ' ').trim())
        .join('\n');

      // Extract key information from the guide content
      const llm = new ChatOpenAI({ temperature: 0 });
      const prompt = `
      Analyze this repair guide content and extract key information:
      
      ${content.substring(0, 3000)} // Limit content length
      
      Provide a detailed summary including:
      1. What specific repair/issue this guide addresses
      2. Required tools and parts
      3. Key steps overview
      4. Any warnings or important notes
      5. Difficulty assessment
      
      Keep the response concise but informative (3-4 sentences max).
      `;
      
      const summary = await llm.invoke([{ role: 'user', content: prompt }]);
      return summary.content;
    } catch (error) {
      console.error("Error fetching detailed guide info:", error);
      return "Unable to fetch detailed information from this guide.";
    }
  },
  {
    name: "get_detailed_guide_info",
    description: "Fetches detailed information from a specific repair guide URL",
    schema: z.object({
      url: z.string().describe("The URL of the repair guide to analyze"),
    }),
  }
);

// Example usage function
async function findRepairGuides(deviceName: string, issueType?: string) {
  try {
    console.log(`\n🔧 Searching for repair guides for: ${deviceName}${issueType ? ` (${issueType})` : ''}`);
    
    // Search for repair guides
    const repairGuides = await searchRepairGuides.invoke({ 
      deviceName: deviceName, 
      issueType: issueType 
    });

    console.log(`\n📋 Found ${repairGuides.length} repair guides:\n`);

    // Display results
    for (let i = 0; i < repairGuides.length; i++) {
      const guide = repairGuides[i];
      console.log(`${i + 1}. ${guide.title}`);
      console.log(`   🔗 URL: ${guide.url}`);
      console.log(`   📝 Summary: ${guide.summary}`);
      console.log(`   📊 Difficulty: ${guide.difficulty}`);
      if (guide.estimatedTime) {
        console.log(`   ⏱️ Estimated Time: ${guide.estimatedTime}`);
      }
      console.log('');
    }

    // Optionally get detailed info for the first guide
    if (repairGuides.length > 0) {
      console.log("🔍 Getting detailed information for the top guide...\n");
      const detailedInfo = await getDetailedGuideInfo.invoke({ url: repairGuides[0].url });
      console.log("📖 Detailed Guide Information:");
      console.log(detailedInfo);
    }

    return repairGuides;

  } catch (error) {
    console.error("Error finding repair guides:", error);
    return [];
  }
}

// Example usage
async function runRepairAgent() {
  // Example 1: iPhone screen repair
  await findRepairGuides("iPhone 14", "screen replacement");
  
  // Example 2: General laptop repair
  await findRepairGuides("MacBook Pro 2020", "keyboard repair");
  
  // Example 3: Gaming console repair
  await findRepairGuides("PlayStation 5", "overheating");
}

// Execute the function
runRepairAgent();