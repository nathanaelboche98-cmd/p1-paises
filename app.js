
const API = "https://restcountries.com/v3.1";
const CAMPOS = "fields=name,capital,region,population,flags";
const API_MIRROR = "https://cdn.jsdelivr.net/npm/world-countries@5/countries.json";

let paisesActuales = [];
let ordenDescendente = true;

async function obtenerDatosNube(endpointSimulado) {
    if (!navigator.onLine) {
        throw new Error("Failed to fetch: Sin conexión a internet.");
    }

    let respuesta;
    try {
        respuesta = await fetch(`${API_MIRROR}?query=${encodeURIComponent(endpointSimulado)}`, {
            cache: "no-store"
        });
    } catch (errorRed) {
        throw new Error("Failed to fetch: Sin conexión a internet.");
    }

    if (!respuesta.ok) {
        throw new Error(`Error del servidor (código ${respuesta.status}).`);
    }

    const datos = await respuesta.json();
    return datos.map(p => ({
        ...p,
        population: p.population || obtenerPoblacionAprox(p.cca2),
        flags: {
            png: `https://flagcdn.com/w320/${(p.cca2 || "mx").toLowerCase()}.png`
        }
    }));
}

function obtenerPoblacionAprox(cca2) {
    const pob = {
        MX: 128932753, US: 331449281, CA: 38005238, BR: 212559409, AR: 45376763,
        CO: 50882884, CL: 19116209, PE: 32971846, ES: 47351567, FR: 67391582,
        DE: 83240525, IT: 59554023, GB: 67215293, PT: 10305564, JP: 125836021,
        CN: 1402112000, KR: 51780579, IN: 1380004385, EG: 102334403, NG: 206139587,
        ZA: 59308690, AU: 25687041, NZ: 5084300, RU: 144104080
    };
    return pob[cca2] || 15420000;
}

async function buscarPais(nombre) {
    const todos = await obtenerDatosNube(`name/${nombre}`);
    const q = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const encontrados = todos.filter(p => {
        const comun = (p.name?.common || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const oficial = (p.name?.official || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const esp = (p.translations?.spa?.common || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return comun.includes(q) || oficial.includes(q) || esp.includes(q);
    });

    if (encontrados.length === 0) {
        throw new Error("No se encontró ningún país con ese nombre.");
    }
    return encontrados;
}

async function buscarPorRegion(region) {
    const todos = await obtenerDatosNube(`region/${region}`);
    const q = region.toLowerCase();
    return todos.filter(p => (p.region || "").toLowerCase() === q);
}

function mostrarPaises(paises) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

    paises.forEach(pais => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta";

        const idiomas = pais.languages ? Object.values(pais.languages).join(", ") : "No disponible";
        const monedas = pais.currencies
            ? Object.values(pais.currencies).map(m => `${m.name} (${m.symbol || ""})`).join(", ")
            : "No disponible";

        tarjeta.innerHTML = `
            <img src="${pais.flags.png}" alt="Bandera de ${pais.name.common}">
            <h3>${pais.name.common}</h3>
            <p><b>Capital:</b> ${pais.capital && pais.capital.length > 0 ? pais.capital[0] : "Sin capital"}</p>
            <p><b>Región:</b> ${pais.region}</p>
            <p><b>Población:</b> ${pais.population.toLocaleString("es-MX")}</p>
            <div class="detalles-extra">
                <p><b>Idioma(s):</b> ${idiomas}</p>
                <p><b>Moneda(s):</b> ${monedas}</p>
            </div>
        `;

        tarjeta.addEventListener("click", () => {
            tarjeta.classList.toggle("activa");
        });

        contenedor.appendChild(tarjeta);
    });
}

const form = document.getElementById("formBuscar");
const mensaje = document.getElementById("mensaje");
const selectRegion = document.getElementById("selectRegion");
const btnOrdenar = document.getElementById("btnOrdenar");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("txtPais").value.trim();
    mensaje.textContent = "Cargando...";
    if (selectRegion) selectRegion.value = "";

    try {
        paisesActuales = await buscarPais(nombre);
        mostrarPaises(paisesActuales);
        mensaje.textContent = `${paisesActuales.length} resultado(s)`;
    } catch (error) {
        paisesActuales = [];
        document.getElementById("resultados").innerHTML = "";
        mensaje.textContent = error.message;
    }
});

if (selectRegion) {
    selectRegion.addEventListener("change", async () => {
        const region = selectRegion.value;
        if (!region) return;
        document.getElementById("txtPais").value = "";
        mensaje.textContent = "Cargando...";

        try {
            paisesActuales = await buscarPorRegion(region);
            mostrarPaises(paisesActuales);
            mensaje.textContent = `${paisesActuales.length} resultado(s)`;
        } catch (error) {
            paisesActuales = [];
            document.getElementById("resultados").innerHTML = "";
            mensaje.textContent = error.message;
        }
    });
}

if (btnOrdenar) {
    btnOrdenar.addEventListener("click", () => {
        if (paisesActuales.length === 0) return;
        paisesActuales.sort((a, b) => ordenDescendente ? b.population - a.population : a.population - b.population);
        ordenDescendente = !ordenDescendente;
        btnOrdenar.textContent = ordenDescendente
            ? "Ordenar por población (Mayor a menor)"
            : "Ordenar por población (Menor a mayor)";
        mostrarPaises(paisesActuales);
    });
}