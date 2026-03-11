const leadKey = "webcode.leads.v2";
const leadTable = document.getElementById("lead-table");
const chatLog = document.getElementById("chat-log");
const menuBtn = document.getElementById("menu-btn");
const mainNav = document.getElementById("main-nav");

menuBtn.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

const botPrompts = [
  "Great — what type of product are you building (website, app, dashboard, or e-commerce)?",
  "What timeline and target launch date do you have in mind?",
  "Please share your email so our team can send a tailored proposal."
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
  writeLeads([lead, ...readLeads()]);
  renderLeads();
}

function renderLeads() {
  const leads = readLeads();
  leadTable.innerHTML = "";

  if (!leads.length) {
    leadTable.innerHTML = `<tr><td colspan="5">No leads captured yet.</td></tr>`;
    return;
  }

  leads.forEach((lead) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${lead.name}</td>
      <td>${lead.email}</td>
      <td>${lead.company || "—"}</td>
      <td>${lead.source}</td>
      <td>${lead.status}</td>
    `;
    leadTable.appendChild(row);
  });
}

function addChatMessage(type, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${type}`;
  msg.textContent = text;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function getBotReply(userText) {
  const input = userText.toLowerCase();

  if (input.includes("price") || input.includes("cost") || input.includes("budget")) {
    return "Most projects range from $2k to $20k+ depending on scope. Share your goals for a precise estimate.";
  }

  if (input.includes("timeline") || input.includes("deadline")) {
    return "Typical delivery is 2–8 weeks. Complex platforms can be phased for faster launches.";
  }

  if (input.includes("seo")) {
    return "Yes — we include technical SEO setup and performance optimization for better ranking potential.";
  }

  return botPrompts[Math.floor(Math.random() * botPrompts.length)];
}

document.getElementById("chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);

  const reply = getBotReply(text);
  setTimeout(() => addChatMessage("bot", reply), 260);

  if (text.includes("@")) {
    appendLead({
      name: "Chat Lead",
      email: text,
      company: "",
      source: "chatbot",
      status: "new"
    });
    setTimeout(() => addChatMessage("bot", "Thanks! Your email is captured. Our team will reach out shortly."), 340);
  }

  input.value = "";
});

document.getElementById("contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  appendLead({
    name: data.get("name"),
    email: data.get("email"),
    company: data.get("company"),
    source: "contact-form",
    status: "new"
  });

  addChatMessage("bot", `Thanks ${data.get("name")}! We received your request and will contact you soon.`);
  form.reset();
});

addChatMessage("bot", "Hi! I’m WebCode AI assistant. Share your project requirements to get started.");
renderLeads();
