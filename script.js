// Variável global para armazenar todos os dados
let allOrdersData = [];

document.addEventListener("DOMContentLoaded", function () {
  const docInput = document.getElementById("docInput");
  const searchBtn = document.getElementById("searchBtn");
  const loading = document.getElementById("loading");
  const resultContainer = document.getElementById("resultContainer");
  const notFound = document.getElementById("notFound");
  const themeSwitch = document.getElementById("checkbox");
  const themeText = document.querySelector(".theme-text");

  // URL da API Apps Script (agora carrega todos os dados)
  const API_URL =
    "https://script.google.com/macros/s/AKfycbwARJ6spZrG8OWzpy2n---8LpHCVoCREDfVI706YhHZzgjGfvlGOfBHrhp_0xYXAFpU/exec"; // Substitua pelo ID correto

  docInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length <= 11) {
      value = value
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      value = value
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    e.target.value = value;
  });

  function validateDocument(doc) {
    const cleaned = doc.replace(/\D/g, "");
    return {
      type: cleaned.length === 11 ? "CPF" : "CNPJ",
      isValid: cleaned.length === 11 || cleaned.length === 14,
      cleaned,
    };
  }

  docInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") searchOrder();
  });

  searchBtn.addEventListener("click", searchOrder);
  themeSwitch.addEventListener("change", toggleTheme);

  showLoading();
  loadAllOrdersData();

  if (localStorage.getItem("theme") === "light") {
    themeSwitch.checked = true;
    toggleTheme();
  }

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

    findOrderData(cleaned, type);
  }

  function loadAllOrdersData() {
    const callbackName = "handleOrdersData_" + new Date().getTime();

    window[callbackName] = function (data) {
      delete window[callbackName];

      if (data && Array.isArray(data)) {
        allOrdersData = data;
        hideLoading();
        showMessage("Digite um CPF ou CNPJ para pesquisar");
      } else if (data && data.error) {
        handleDataError(new Error(data.error));
      } else {
        handleDataError(new Error("Formato de dados inválido"));
      }
    };

    const timeoutId = setTimeout(function () {
      if (window[callbackName]) {
        delete window[callbackName];
        handleDataError(new Error("Timeout ao carregar dados"));
      }
    }, 15000);

    const script = document.createElement("script");
    script.src = `${API_URL}?callback=${callbackName}`;

    script.onerror = function () {
      clearTimeout(timeoutId);
      if (window[callbackName]) {
        delete window[callbackName];
      }
      handleDataError(new Error("Erro de conexão ao carregar dados"));
    };

    document.body.appendChild(script);
  }

  function findOrderData(docNumber, docType) {
    showLoading();

    setTimeout(() => {
      try {
        const fieldToSearch = docType === "CPF" ? "cpf" : "cnpj";
        const results = allOrdersData.filter(
          (order) =>
            order[fieldToSearch] &&
            order[fieldToSearch].replace(/\D/g, "") === docNumber
        );

        if (results.length > 0) {
          displayOrderData(results[0]);
        } else {
          showNotFound();
        }
      } catch (error) {
        console.error("Erro na busca local:", error);
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Falha ao processar a busca",
        });
        hideLoading();
      }
    }, 100);
  }

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

    setupComprovanteView(order.comprovante);
    showResults();
  }

  function setupComprovanteView(comprovanteUrl) {
    const placeholder = document.getElementById("comprovantePlaceholder");
    const view = document.getElementById("comprovanteView");
    const unavailable = document.getElementById("comprovanteUnavailable");
    const iframe = document.getElementById("comprovanteIframe");

    placeholder.style.display = "none";
    view.style.display = "none";
    unavailable.style.display = "none";

    if (comprovanteUrl) {
      try {
        const viewUrl = getViewUrl(comprovanteUrl);
        iframe.src = viewUrl;
        view.style.display = "block";
      } catch (e) {
        unavailable.style.display = "flex";
      }
    } else {
      unavailable.style.display = "flex";
    }
  }

  function getViewUrl(driveUrl) {
    if (!driveUrl) return null;

    const match = driveUrl.match(/[-\w]{25,}/);
    if (!match) return driveUrl;
    const fileId = match[0];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

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
    notFound.classList.add("d-none");
  }

  function showNotFound() {
    hideLoading();
    notFound.classList.remove("d-none");
    resultContainer.classList.add("d-none");
  }

  function showMessage(message) {
    hideLoading();
    notFound.innerHTML = `<div class="text-center p-4"><p>${message}</p></div>`;
    notFound.classList.remove("d-none");
    resultContainer.classList.add("d-none");
  }

  function handleDataError(error) {
    console.error("Erro ao carregar dados:", error);
    hideLoading();
    Swal.fire({
      icon: "error",
      title: "Erro de Carregamento",
      text: "Não foi possível carregar os dados. Por favor, recarregue a página.",
    });
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

  function formatDate(dateString) {
    if (!dateString) return null;

    if (typeof dateString === "string" && dateString.includes("/")) {
      return dateString;
    }

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? dateString
        : date.toLocaleDateString("pt-BR");
    } catch (e) {
      return dateString;
    }
  }

  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeText.textContent = isDark ? "Modo Light" : "Modo Dark";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }
});
