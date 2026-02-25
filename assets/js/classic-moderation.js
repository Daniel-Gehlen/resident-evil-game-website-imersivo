// assets/js/classic-moderation.js
// Módulo de verificação de idade, monitoramento de IP e filtro de comentários
// Compatível com LGPD e normas globais de privacidade

(function () {
  "use strict";

  // ==================== CONFIGURAÇÕES ====================
  const CONFIG = {
    AGE_MIN: 18,
    STORAGE_KEY: "re_verified_age",
    IP_CHECK_URL: "https://api.ipify.org?format=json",
    IP_BLOCKLIST: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"], // IPs privados (não bloqueia, apenas alerta)
    SUSPICIOUS_PATTERNS: [
      /bot|crawl|spider|scrape|headless|selenium|puppet/i,
      /datacenter|vpn|proxy|tor/i,
      /aws|googlecloud|azure|digitalocean/i,
    ],
    COMMENT_MAX_LENGTH: 1000,
    COMMENT_MIN_LENGTH: 3,
  };

  // ==================== LISTAS DE BLOQUEIO ====================
  const BLOCKLISTS = {
    // Palavras e frases de ódio (português + inglês básico)
    HATE_WORDS: [
      // Português
      "nego",
      "macaco",
      "criolo",
      "viado",
      "bicha",
      "sapatão",
      "veado",
      "trouxa",
      "lixo",
      "nojento",
      "escroto",
      "otário",
      "nazista",
      "fascista",
      "comunista",
      "lula",
      "bolsonaro", // termos políticos podem gerar briga
      "morte a",
      "matar",
      "estuprar",
      "violentar",

      // Inglês
      "nigger",
      "faggot",
      "retard",
      "idiot",
      "stupid",
      "hate",
      "kill yourself",
      "die",
      "trump",
      "biden",
      "libtard",
      "redneck",
      "terrorist",
      "islam",
      "christian",
      "jew",
      "holocaust",

      // Ofensas direcionadas
      "burro",
      "burra",
      "feio",
      "feia",
      "gordo",
      "gorda",
      "idiota",
      "imbecil",
      "cretino",
      "babaca",
      "arrombado",
      "desgraçado",

      // Ameaças
      "vou te",
      "te pego",
      "te encontro",
      "sua casa",
      "enderenço",
      "hackear",
      "invadir",
      "derrubar",
      "ddos",
    ],

    // Padrões de bots/IA
    AI_PATTERNS: [
      /as\s+an\s+ai/i,
      /i\s+am\s+an?\s+ai/i,
      /chatgpt/i,
      /openai/i,
      /bard/i,
      /copilot/i,
      /language\s+model/i,
      /assistant/i,
      /generated\s+by/i,
      /response\s+generated/i,
      /neural\s+network/i,
      /machine\s+learning/i,
      /gpt/i,
      /claude/i,
      /llama/i,
      /gemini/i,
      /deepseek/i,
      /prompt:/i,
      /\[system\]/i,
      /\[INST\]/i,
      /###\s+human:/i,
      /###\s+assistant:/i,
    ],

    // URLs suspeitas (spam)
    SUSPICIOUS_URLS: [
      /\.ru\//i,
      /\.cn\//i,
      /bit\.ly/i,
      /tinyurl/i,
      /shorturl/i,
      /casino/i,
      /poker/i,
      /bet/i,
      /viagra/i,
      /cialis/i,
      /pharmacy/i,
      /buy\s+/i,
      /cheap\s+/i,
      /free\s+/i,
    ],
  };

  // ==================== ESTADO GLOBAL ====================
  let userIP = null;
  let userLocation = null;
  let isVerified = false;

  // ==================== UTILITÁRIOS ====================
  function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [Moderation] ${message}`, data || "");
    // Em produção, enviar para servidor de logs
  }

  function showMessage(text, type = "info", duration = 5000) {
    const msgDiv =
      document.getElementById("moderation-message") ||
      (() => {
        const div = document.createElement("div");
        div.id = "moderation-message";
        div.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                padding: 15px 25px;
                border-radius: 8px;
                font-weight: bold;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: opacity 0.3s;
                max-width: 400px;
            `;
        document.body.appendChild(div);
        return div;
      })();

    msgDiv.style.backgroundColor =
      type === "error" ? "#b43b3b" : type === "warning" ? "#c9a45b" : "#2b6f9c";
    msgDiv.style.color = "white";
    msgDiv.style.border = type === "error" ? "2px solid #ff9999" : "none";
    msgDiv.textContent = text;

    setTimeout(() => {
      msgDiv.style.opacity = "0";
      setTimeout(() => msgDiv.remove(), 500);
    }, duration);
  }

  // ==================== VERIFICAÇÃO DE IP ====================
  async function checkIP() {
    try {
      // Tenta obter IP via API pública
      const response = await fetch(CONFIG.IP_CHECK_URL);
      const data = await response.json();
      userIP = data.ip;

      // Verifica se IP é suspeito
      const isSuspicious = CONFIG.SUSPICIOUS_PATTERNS.some(
        (pattern) => pattern.test(userIP) || pattern.test(navigator.userAgent),
      );

      if (isSuspicious) {
        log("warn", "Acesso suspeito detectado", {
          ip: userIP,
          userAgent: navigator.userAgent,
        });
        // showMessage(
        //   "Comportamento suspeito detectado. Algumas funcionalidades podem ser limitadas.",
        //   "warning",
        //   8000,
        // );
      }

      // Em produção, enviar IP para backend para verificação em lista negra
      log("info", "IP verificado", { ip: userIP });
    } catch (error) {
      log("error", "Falha ao obter IP", error);
      userIP = "unknown";
    }
  }

  // ==================== VERIFICAÇÃO DE IDADE ====================
  function createAgeGate() {
    // Verifica se já verificou antes (sessão apenas)
    if (sessionStorage.getItem(CONFIG.STORAGE_KEY)) {
      isVerified = true;
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "age-gate-overlay";
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

    const modal = document.createElement("div");
    modal.style.cssText = `
            background: #1a171c;
            border: 3px solid #b43b3b;
            border-radius: 30px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.8);
        `;

    modal.innerHTML = `
            <h2 style="color: #b43b3b; font-family: Georgia, serif; font-size: 2rem; margin-bottom: 20px;">RACCOON CITY</h2>
            <p style="color: #e8e4e0; font-size: 1.2rem; margin-bottom: 30px;">
                Este site contém conteúdo violento e imagens fortes.<br>
                <strong style="color: #c9a45b;">Você tem mais de 18 anos?</strong>
            </p>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="age-yes" style="
                    background: #b43b3b;
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 50px;
                    font-size: 1.2rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 2px solid #c9a45b;
                ">SIM, TENHO +18</button>
                <button id="age-no" style="
                    background: #2b272f;
                    color: #e8e4e0;
                    border: 2px solid #b43b3b;
                    padding: 15px 40px;
                    border-radius: 50px;
                    font-size: 1.2rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                ">NÃO</button>
            </div>
            <p style="color: #7ab7d0; font-size: 0.9rem; margin-top: 30px;">
                Seu IP (${userIP || "desconhecido"}) será registrado conforme a LGPD.<br>
                Conteúdo impróprio para menores de 18 anos.
            </p>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("age-yes").addEventListener("click", () => {
      sessionStorage.setItem(CONFIG.STORAGE_KEY, "true");
      isVerified = true;
      overlay.remove();
      log("info", "Idade verificada: +18", { ip: userIP });
      showMessage("Bem-vindo a Raccoon City, sobrevivente.", "info", 3000);
    });

    document.getElementById("age-no").addEventListener("click", () => {
      log("warn", "Acesso negado - menor de idade", { ip: userIP });
      showMessage(
        "Você não tem idade suficiente para acessar este conteúdo.",
        "error",
        5000,
      );
      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 2000);
    });
  }

  // ==================== FILTRO DE COMENTÁRIOS ====================
  function filterComment(text) {
    if (!text || text.length < CONFIG.COMMENT_MIN_LENGTH) {
      return { allowed: false, reason: "Comentário muito curto" };
    }

    if (text.length > CONFIG.COMMENT_MAX_LENGTH) {
      return { allowed: false, reason: "Comentário muito longo" };
    }

    // Verifica palavras de ódio
    for (let word of BLOCKLISTS.HATE_WORDS) {
      const regex = new RegExp(
        "\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i",
      );
      if (regex.test(text)) {
        log("warn", "Comentário bloqueado: palavra de ódio", { word, text });
        return { allowed: false, reason: "Conteúdo ofensivo detectado" };
      }
    }

    // Verifica padrões de IA
    for (let pattern of BLOCKLISTS.AI_PATTERNS) {
      if (pattern.test(text)) {
        log("warn", "Comentário bloqueado: padrão de IA", { pattern, text });
        return { allowed: false, reason: "Parece ser gerado por IA" };
      }
    }

    // Verifica URLs suspeitas
    for (let pattern of BLOCKLISTS.SUSPICIOUS_URLS) {
      if (pattern.test(text)) {
        log("warn", "Comentário bloqueado: URL suspeita", { pattern, text });
        return { allowed: false, reason: "Spam detectado" };
      }
    }

    // Verifica repetições excessivas (spam)
    const repeatedChars = /(.)\1{10,}/;
    if (repeatedChars.test(text.replace(/\s/g, ""))) {
      return { allowed: false, reason: "Spam detectado (repetição)" };
    }

    return { allowed: true, text: text.trim() };
  }

  // ==================== MONITORAMENTO DE COMPORTAMENTO ====================
  function setupBehaviorMonitoring() {
    let suspiciousActions = 0;
    const MAX_SUSPICIOUS = 5;

    // Monitora cliques rápidos (bot)
    let lastClick = 0;
    document.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastClick < 50) {
        // menos de 50ms entre cliques
        suspiciousActions++;
        log("warn", "Clique muito rápido detectado", {
          count: suspiciousActions,
        });
      }
      lastClick = now;
    });

    // Monitora movimento de mouse (bot raramente move suavemente)
    let mousePositions = [];
    document.addEventListener("mousemove", (e) => {
      mousePositions.push({ x: e.clientX, y: e.clientY, time: Date.now() });
      if (mousePositions.length > 20) mousePositions.shift();

      // Se todos os movimentos forem perfeitamente lineares (suspeito)
      if (mousePositions.length === 20) {
        const linear = mousePositions.every((pos, i, arr) => {
          if (i === 0) return true;
          return (
            Math.abs(pos.x - arr[i - 1].x) < 2 &&
            Math.abs(pos.y - arr[i - 1].y) < 2
          );
        });
        if (linear) {
          suspiciousActions++;
          log("warn", "Movimento de mouse suspeito (linear)", {
            count: suspiciousActions,
          });
        }
      }
    });

    // Se atingir limite, marca como suspeito
    setInterval(() => {
      if (suspiciousActions >= MAX_SUSPICIOUS) {
        log("error", "Comportamento de bot confirmado", {
          ip: userIP,
          suspiciousActions,
        });
        showMessage(
          "Comportamento automatizado detectado. Ações limitadas.",
          "error",
          10000,
        );
        // Em produção: bloquear comentários, exigir CAPTCHA
      }
    }, 30000);
  }

  // ==================== INICIALIZAÇÃO ====================
  async function init() {
    log("info", "Inicializando módulo de moderação");

    // Verifica IP primeiro
    await checkIP();

    // Cria age gate
    createAgeGate();

    // Configura monitoramento
    setupBehaviorMonitoring();

    // Intercepta formulário de comentários
    const commentForm = document.querySelector(".comment-form");
    if (commentForm) {
      const originalSubmit = commentForm.onsubmit;

      commentForm.addEventListener("submit", function (e) {
        e.preventDefault();

        // Verifica idade
        if (!isVerified && !sessionStorage.getItem(CONFIG.STORAGE_KEY)) {
          showMessage(
            "Você precisa confirmar que tem mais de 18 anos.",
            "error",
            4000,
          );
          return;
        }

        const nome = this.querySelector('input[name="nome"]').value;
        const comentario = this.querySelector(
          'textarea[name="comentario"]',
        ).value;

        // Filtra comentário
        const filtered = filterComment(comentario);
        if (!filtered.allowed) {
          showMessage(
            `Comentário bloqueado: ${filtered.reason}`,
            "error",
            5000,
          );
          return;
        }

        // Filtra nome (básico)
        if (filterComment(nome).allowed === false) {
          showMessage("Nome contém conteúdo impróprio", "error", 4000);
          return;
        }

        // Se passou por todos os filtros, adiciona
        const commentList = document.querySelector(".comment-list");
        const newComment = document.createElement("li");
        newComment.className = "comment-item";
        newComment.innerHTML = `
                    <span class="comment-author">${nome.replace(/</g, "&lt;")}</span>
                    <span class="comment-date">${new Date().toLocaleDateString("pt-BR")}</span>
                    <p class="comment-text">${filtered.text.replace(/</g, "&lt;")}</p>
                    <small style="color: #7ab7d0;">✓ Verificado | IP: ${userIP?.split(".").slice(0, 2).join(".")}.xxx.xxx</small>
                `;
        commentList.appendChild(newComment);

        // Limpa formulário
        this.reset();

        log("info", "Comentário aprovado", { nome, ip: userIP });
        showMessage("Comentário publicado com sucesso!", "info", 3000);
      });
    }
  }

  // Auto-inicializa quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
