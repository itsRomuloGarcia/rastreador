document.addEventListener("DOMContentLoaded", function () {
  // Elementos DOM
  const docInput = document.getElementById("docInput");
  const searchBtn = document.getElementById("searchBtn");
  const loading = document.getElementById("loading");
  const resultContainer = document.getElementById("resultContainer");
  const notFound = document.getElementById("notFound");
  const themeSwitch = document.getElementById("checkbox");
  const themeText = document.querySelector(".theme-text");

  // URL da API do Google Apps Script
  const API_URL =
    "https://script.google.com/macros/s/AKfycby1mceHVRe-1rHL5C51EjRZ8zbQO-pD1e9Tqz9rof9I_XcdEha8XtRZ2X-vqszotTOcvw/exec";

  // Máscara dinâmica para CPF/CNPJ
  docInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length <= 11) {
      // CPF
      value = value
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ
      value = value
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    e.target.value = value;
  });

  // Validação de documento
  function validateDocument(doc) {
    const cleaned = doc.replace(/\D/g, "");
    return {
      type: cleaned.length === 11 ? "CPF" : "CNPJ",
      isValid: cleaned.length === 11 || cleaned.length === 14,
      cleaned,
    };
  }

  // Event Listeners
  docInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") searchOrder();
  });

  searchBtn.addEventListener("click", searchOrder);
  themeSwitch.addEventListener("change", toggleTheme);

  // Função principal de busca
  function searchOrder() {
    const { type, isValid, cleaned } = validateDocument(docInput.value);

    if (!isValid) {
      Swal.fire({
        icon: "error",
        title: "Documento inválido",
        text: `Digite um ${type} válido (${
          type === "CPF" ? "11" : "14"
        } dígitos)`,
      });
      return;
    }

    showLoading();
    fetchOrderData(cleaned, type);
  }

  // Busca na API
  async function fetchOrderData(docNumber, docType) {
    try {
      const response = await fetch(
        `${API_URL}?doc=${docNumber}&type=${docType}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na busca");
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);
      if (data.length > 0) displayOrderData(data[0]);
      else showNotFound();
    } catch (error) {
      console.error("Erro:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: error.message || "Falha ao buscar dados",
      });
      hideLoading();
    }
  }

  // Exibe resultados
  function displayOrderData(order) {
    document.getElementById("pedido").textContent = order.pedido || "N/A";
    document.getElementById("razaoSocial").textContent =
      order.razaoSocial || "N/A";
    document.getElementById("nomeFantasia").textContent =
      order.nomeFantasia || "N/A";
    document.getElementById("marca").textContent = order.marca || "N/A";
    document.getElementById("notaFiscal").textContent =
      order.notaFiscal || "N/A";
    document.getElementById("cidade").textContent = order.cidade || "N/A";
    document.getElementById("uf").textContent = order.uf || "N/A";
    document.getElementById("dataPrevSaida").textContent =
      formatDate(order.dataPrevSaida) || "N/A";
    document.getElementById("dataRealSaida").textContent =
      formatDate(order.dataRealSaida) || "N/A";
    document.getElementById("dataPrevEntrega").textContent =
      formatDate(order.dataPrevEntrega) || "N/A";
    document.getElementById("dataEntrega").textContent =
      formatDate(order.dataEntrega) || "N/A";
    document.getElementById("transportadora").textContent =
      order.transportadora || "N/A";

    const statusBadge = document.getElementById("status");
    statusBadge.textContent = order.status || "N/A";
    updateStatusBadge(statusBadge, order.status);

    setupDownloadButton(order.comprovante);
    showResults();
  }

  // Auxiliares de UI
  function showLoading() {
    loading.classList.remove("d-none");
    resultContainer.classList.add("d-none");
    notFound.classList.add("d-none");
  }

  function hideLoading() {
    loading.classList.add("d-none");
  }

  function showResults() {
    hideLoading();
    resultContainer.classList.remove("d-none");
  }

  function showNotFound() {
    hideLoading();
    notFound.classList.remove("d-none");
  }

  function updateStatusBadge(element, status) {
    if (!status) return;

    element.classList.remove(
      "bg-primary",
      "bg-success",
      "bg-warning",
      "bg-danger"
    );

    if (/entregue/i.test(status)) element.classList.add("bg-success");
    else if (/transito|rota/i.test(status)) element.classList.add("bg-primary");
    else if (/pendente|aguardando/i.test(status))
      element.classList.add("bg-warning");
    else element.classList.add("bg-danger");
  }

  function setupDownloadButton(comprovanteUrl) {
    const btn = document.getElementById("downloadBtn");

    if (comprovanteUrl) {
      btn.onclick = () => window.open(fixDriveUrl(comprovanteUrl), "_blank");
      btn.disabled = false;
    } else {
      btn.disabled = true;
      btn.setAttribute("title", "Comprovante não disponível");
    }
  }

  // Utilitários
  function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleDateString("pt-BR");
  }

  function fixDriveUrl(url) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match
      ? `https://drive.google.com/uc?export=download&id=${match[1]}`
      : url;
  }

  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeText.textContent = isDark ? "Modo Light" : "Modo Dark";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  // Inicialização
  if (localStorage.getItem("theme") === "light") {
    themeSwitch.checked = true;
    toggleTheme();
  }
});
