const leadKey = "webcode.leads";
const leadTable = document.getElementById("lead-table");
const chatLog = document.getElementById("chat-log");

const botPrompts = [
  "Tell me your project goal and preferred timeline.",
  "Do you need website design, development, or both?",
  "Please share your email and we'll follow up with a proposal."
];

function readLeads() {
  try {
    return JSON.parse(localStorage.getItem(leadKey)) ?? [];
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  localStorage.setItem(leadKey, JSON.stringify(leads));
}

function appendLead(lead) {
  const leads = [lead, ...readLeads()];
  writeLeads(leads);
  renderLeads();
}

function renderLeads() {
  const leads = readLeads();
  leadTable.innerHTML = "";

  if (leads.length === 0) {
    leadTable.innerHTML = `<tr><td colspan="5">No leads captured yet.</td></tr>`;
    return;
  }

  for (const lead of leads) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${lead.name}</td>
      <td>${lead.email}</td>
      <td>${lead.source}</td>
      <td>${lead.message}</td>
      <td>${lead.status}</td>
    `;
    leadTable.appendChild(row);
  }
}

function addChatMessage(type, text) {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

let promptIndex = 0;
function botReply(userText) {
  const lower = userText.toLowerCase();
  if (lower.includes("price") || lower.includes("cost")) {
    return "Pricing depends on scope. Share goals and budget range for a detailed estimate.";
  }
  if (lower.includes("timeline") || lower.includes("deadline")) {
    return "Typical delivery is 2-8 weeks depending on complexity and integrations.";
  }
  const response = botPrompts[promptIndex % botPrompts.length];
  promptIndex += 1;
  return response;
}

document.getElementById("chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  const reply = botReply(text);
  setTimeout(() => addChatMessage("bot", reply), 350);

  if (text.includes("@")) {
    appendLead({
      name: "Chat User",
      email: text,
      source: "chatbot",
      message: "Captured from chatbot conversation",
      status: "new"
    });
  }

  input.value = "";
});

document.getElementById("contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const lead = {
    name: data.get("name"),
    email: data.get("email"),
    source: "contact-form",
    message: data.get("message"),
    status: "new"
  };

  appendLead(lead);
  addChatMessage("bot", `Thanks ${lead.name}, your request has been saved. Our team will contact you soon.`);
  form.reset();
});

addChatMessage("bot", "Hi! I'm your AI assistant. What are you planning to build?");
renderLeads();
