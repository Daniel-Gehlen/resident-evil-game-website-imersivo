// resident-evil-site/assets/js/main.js
(function verifyVideos() {
  const iframes = document.querySelectorAll("iframe");
  if (iframes.length) {
    console.log(
      "🎮 Site modular RE: " +
        iframes.length +
        " vídeos oficiais embedados (conteúdo atualizado com a cronologia completa).",
    );
  }
})();

// Função para tratar envio do formulário (prevenindo reload para demonstração)
document.addEventListener("DOMContentLoaded", function () {
  const commentForm = document.querySelector(".comment-form");
  if (commentForm) {
    commentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const nome = this.querySelector('input[name="nome"]').value;
      const comentario = this.querySelector(
        'textarea[name="comentario"]',
      ).value;

      if (nome && comentario) {
        // Criar novo comentário
        const commentList = document.querySelector(".comment-list");
        const newComment = document.createElement("li");
        newComment.className = "comment-item";
        newComment.innerHTML = `
                    <span class="comment-author">${nome}</span>
                    <span class="comment-date">${new Date().toLocaleDateString("pt-BR")}</span>
                    <p class="comment-text">${comentario}</p>
                `;
        commentList.appendChild(newComment);

        // Limpar formulário
        this.reset();
      }
    });
  }
});

// resident-evil-site/assets/js/main.js
(function verifyVideos() {
  const iframes = document.querySelectorAll("iframe");
  if (iframes.length) {
    console.log(
      "🎮 Site modular RE: " +
        iframes.length +
        " vídeos oficiais embedados (trailers corrigidos).",
    );
  }
})();

// Função para tratar envio do formulário (prevenindo reload para demonstração)
document.addEventListener("DOMContentLoaded", function () {
  const commentForm = document.querySelector(".comment-form");
  if (commentForm) {
    commentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const nome = this.querySelector('input[name="nome"]').value;
      const comentario = this.querySelector(
        'textarea[name="comentario"]',
      ).value;

      if (nome && comentario) {
        const commentList = document.querySelector(".comment-list");
        const newComment = document.createElement("li");
        newComment.className = "comment-item";
        newComment.innerHTML = `
                    <span class="comment-author">${nome}</span>
                    <span class="comment-date">${new Date().toLocaleDateString("pt-BR")}</span>
                    <p class="comment-text">${comentario}</p>
                `;
        commentList.appendChild(newComment);
        this.reset();
      }
    });
  }
});
