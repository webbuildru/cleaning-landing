"use strict";

const calculator = document.querySelector("#calculator");
const furniture = calculator.elements.namedItem("item");
const quantity = calculator.elements.namedItem("quantity");
const estimate = document.querySelector("#estimate-total");
const rubles = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
function updateEstimate() {
  estimate.value = rubles.format(Number(furniture.value) * Number(quantity.value));
}
calculator.addEventListener("change", updateEstimate);
calculator.addEventListener("submit", event => event.preventDefault());
updateEstimate();

const requestForm = document.querySelector("#request-form");
const requestService = document.querySelector("#request-service");
const requestStatus = document.querySelector("#request-status");
const requestPhone = document.querySelector("#request-phone");
const phoneError = document.querySelector("#request-phone-error");

document.querySelector("[data-use-estimate]").addEventListener("click", () => {
  requestService.value = furniture.selectedOptions[0].dataset.service;
  requestStatus.textContent = "";
});

requestForm.addEventListener("input", event => {
  requestStatus.textContent = "";
  if (event.target === requestPhone) {
    requestPhone.removeAttribute("aria-invalid");
    phoneError.hidden = true;
    phoneError.textContent = "";
  }
});
requestForm.addEventListener("submit", event => {
  event.preventDefault();
  const phone = requestPhone.value.trim();
  const digits = phone.replace(/\D/g, "");
  if (!/^\+?[0-9() .-]+$/.test(phone) || digits.length < 10 || digits.length > 15) {
    requestPhone.setAttribute("aria-invalid", "true");
    phoneError.hidden = false;
    phoneError.textContent = "Укажите от 10 до 15 цифр. Например, +7 900 000-00-00.";
    requestPhone.focus();
    return;
  }
  requestPhone.removeAttribute("aria-invalid");
  phoneError.hidden = true;
  phoneError.textContent = "";
  requestStatus.textContent = "Заявка отправлена";
});

const simulator = document.querySelector("#sofa-demo");
function loadSimulator() {
  const script = document.createElement("script");
  script.src = "sofa.bundle.js";
  script.addEventListener("load", () => window.CleaningSofa?.mount(simulator), { once: true });
  document.head.append(script);
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    loadSimulator();
  }, { rootMargin: "160px" });
  observer.observe(simulator);
} else {
  loadSimulator();
}
