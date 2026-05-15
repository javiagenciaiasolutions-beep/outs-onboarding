"use client";

import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp,
  Info,
  LayoutDashboard,
  ExternalLink,
  Code2,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- CONSTANTS & DATA ---

const PROJECTS = [
  {
    id: "01",
    title: "Nuevo Lead",
    description: "Cuando llega un nuevo cliente, se le da la bienvenida (falta definir mensajes y archivos exactos), pide fotos y hace seguimiento inteligente de los estados.",
    apis: ["Odoo", "n8n", "Evolution API", "Email"],
    steps: [
      {
        id: "p1-1",
        type: "trigger",
        title: "Se crea un nuevo cliente en el sistema",
        subtitle: "El sistema detecta automáticamente cuando alguien se registra. Existe una casilla en el lead que indica en qué está interesado para dar contexto al asesor.",
        api: ["Odoo", "n8n"],
        details: ["Trigger: Nuevo contacto creado en Odoo", "Contexto: Leer casilla 'Producto de Interés'", "Filtro: Casilla de producto NO es Barbacoa", "Modelo: crm.lead / res.partner", "Polling cada 10 minutos"]
      },
      {
        id: "p1-3",
        type: "wait",
        title: "El sistema espera unos minutos",
        subtitle: "Pausa estratégica antes de contactar al cliente por WhatsApp.",
        api: ["n8n"],
        details: ["Wait node de n8n", "Tiempo configurable (recomendado: 5-10 min)"]
      },
      {
        id: "p1-4",
        type: "api_call",
        title: "Se envía mensaje de bienvenida por WhatsApp",
        subtitle: "Se solicita al cliente las fotos y vídeos necesarios para el presupuesto.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send", "type: 'text'", "to: teléfono del contacto (E.164)"]
      },
      {
        id: "p1-5",
        type: "decision",
        title: "¿Envía el material solicitado?",
        subtitle: "El sistema espera la respuesta. Si llega, procesa al instante; si no, espera 1 día hábil.",
        api: ["Evolution API", "n8n"],
        details: ["Webhook entrante de Evolution API", "Wait for Webhook (max 24h laborables)", "Verificar adjuntos en el mensaje"]
      },
      {
        id: "p1-5-yes",
        type: "branch_yes",
        branchLabel: "SÍ — Envía material",
        title: "Se guardan los archivos automáticamente",
        subtitle: "El sistema descarga las fotos y las vincula directamente a la ficha de Odoo.",
        api: ["Evolution API", "Odoo"],
        details: ["GET archivo desde Evolution API", "Convertir a Base64", "POST ir.attachment en Odoo vinculado al Lead"]
      },
      {
        id: "p1-5-no",
        type: "branch_no",
        branchLabel: "NO — Sin respuesta (24h)",
        title: "Se envía un recordatorio amable",
        subtitle: "Segundo contacto por WhatsApp para solicitar de nuevo el material.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send tipo text", "Texto de recordatorio amable"]
      },
      {
        id: "p1-6",
        type: "decision",
        title: "¿Responde al recordatorio?",
        subtitle: "Nueva espera de 1 día hábil para recibir el material tras el aviso.",
        api: ["Evolution API", "n8n"],
        details: ["Webhook entrante de Evolution API", "Wait for Webhook (max 24h laborables)"]
      },
      {
        id: "p1-6-yes",
        type: "branch_yes",
        branchLabel: "SÍ — Responde ahora",
        title: "Se vinculan los archivos a Odoo",
        subtitle: "El sistema procesa el material recibido y lo adjunta a la ficha del cliente.",
        api: ["Evolution API", "Odoo"],
        details: ["Procesamiento de adjuntos", "POST ir.attachment en Odoo"]
      },
      {
        id: "p1-6-no",
        type: "branch_no",
        branchLabel: "NO — Sigue sin responder",
        title: "Se envía audio preestablecido",
        subtitle: "Último intento de contacto mediante un mensaje de voz automático.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send", "type: 'audio'", "url: enlace al archivo de audio pregrabado"]
      },
      {
        id: "p1-7",
        type: "api_call",
        title: "Se registra toda la actividad",
        subtitle: "El historial de mensajes y envíos queda guardado en la ficha de Odoo.",
        api: ["Odoo"],
        details: ["POST mail.message → Log conversación en Odoo", "model: mail.message", "res_id: ID del crm.lead"]
      }
    ]
  },
  {
    id: "02",
    title: "Valoración",
    description: "Cuando un cliente pasa a 'Cliente terminado' y tiene marcada la casilla de valoración, se le envía un WhatsApp (para Google).",
    apis: ["Odoo", "Evolution API"],
    steps: [
      {
        id: "p2-1",
        type: "trigger",
        title: "Cliente en estado Terminado con valoración",
        subtitle: "El sistema detecta cuando un cliente pasa al estado 'Cliente terminado' (o similar en Odoo) y tiene marcada la casilla de valoración.",
        api: ["Odoo", "n8n"],
        details: ["Trigger: Estado = 'Cliente terminado'", "Condición: Casilla 'Valoración' marcada", "Polling cada 15 minutos en n8n"]
      },
      {
        id: "p2-2",
        type: "api_call",
        title: "Se envía la reseña de Google por WhatsApp",
        subtitle: "Se envía un mensaje de WhatsApp automatizado con el enlace directo para dejar valoración en Google.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send", "Enlace: Reseñas de Empresa en Google"]
      }
    ]
  },
  {
    id: "03",
    title: "Packs Mantenimiento",
    description: "4 días después de instalar el césped, el cliente recibe automáticamente una oferta de pack de mantenimiento.",
    apis: ["Odoo", "Evolution API"],
    steps: [
      {
        id: "p3-1",
        type: "trigger",
        title: "Se detecta un Cliente Terminado con césped",
        subtitle: "El sistema verifica que el cliente haya pasado a 'Cliente terminado' y busca en su ficha si ha instalado césped.",
        api: ["Odoo", "n8n"],
        details: ["Trigger: Cliente en estado 'Cliente terminado'", "Verificación: Ha instalado un producto categorizado como césped artificial"]
      },
      {
        id: "p3-2",
        type: "wait",
        title: "El sistema espera 10 días",
        subtitle: "Pausa programada de 10 días tras la instalación para ofrecer el mantenimiento.",
        api: ["n8n"],
        details: ["Wait node con fecha absoluta", "Cálculo: fecha_instalacion + 10 días"]
      },
      {
        id: "p3-3",
        type: "api_call",
        title: "Se envía un vídeo por WhatsApp",
        subtitle: "Primer mensaje de la oferta de mantenimiento mostrando un vídeo promocional.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send", "type: 'video'"]
      },
      {
        id: "p3-3-wait",
        type: "wait",
        title: "Espera de 1 minuto",
        subtitle: "Breve espera antes de enviar el archivo PDF.",
        api: ["n8n"],
        details: ["Wait node: 1 minuto"]
      },
      {
        id: "p3-3-pdf",
        type: "api_call",
        title: "Se envía PDF con precios",
        subtitle: "Mensaje de WhatsApp con el documento PDF de los precios de packs.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send", "type: 'document'"]
      },
      {
        id: "p3-4",
        type: "action",
        title: "Se registra el envío de la oferta",
        subtitle: "Se marca en la ficha del cliente para evitar duplicidad en el futuro.",
        api: ["Odoo"],
        details: ["Acción: Marcar x_pack_enviado = True en Odoo", "method: write sobre sale.order o crm.lead"]
      }
    ]
  },
  {
    id: "04",
    title: "BBDD Arquitectos",
    description: "Cuando el equipo añade un arquitecto a la lista y lo marca como 'pendiente', el sistema le manda los mensajes de prospección según su tipo de cliente desde un Excel de Drive.",
    apis: ["Sheets", "Evolution API"],
    steps: [
      {
        id: "p4-1",
        type: "trigger",
        title: "Se detecta un nuevo arquitecto pendiente",
        subtitle: "El sistema revisa el Excel en Drive para iniciar el contacto dependiendo del tipo de cliente.",
        api: ["Sheets", "n8n"],
        details: ["Trigger: Estado = 'pendiente' en Excel Drive", "Identifica 'tipo de cliente' (10 posibles)"]
      },
      {
        id: "p4-2",
        type: "api_call",
        title: "Se envía el primer mensaje predefinido",
        subtitle: "Presentación eligiendo el 'Mensaje N' correspondiente de la tabla de 10 posibles mensajes/respuestas.",
        api: ["Evolution API"],
        details: ["POST /v1/messages/send", "Dato: Columna extraída de Excel ('Mensaje 1/2...10') en función del rol"]
      },
      {
        id: "p4-3",
        type: "action",
        title: "Se anota que se envió el mensaje",
        subtitle: "El sistema registra que ya contactamos y anota el tiempo actual.",
        api: ["Sheets"],
        details: ["Acción: Actualizar timestamp de envío en Sheets", "PUT /v4/spreadsheets/{id}/values/{range}"]
      },
      {
        id: "p4-4",
        type: "wait",
        title: "El sistema espera 2 días",
        subtitle: "Pausa para dar margen al contacto para contestar.",
        api: ["n8n", "Evolution API"],
        details: ["Wait node: Espera de 48 horas sin recibir evento de respuesta"]
      },
      {
        id: "p4-5",
        type: "decision",
        title: "¿Ha contestado al mensaje inicial?",
        subtitle: "Comprobación automática de mensajes con el lead.",
        api: ["Evolution API"],
        details: ["Si el cliente ha hablado a la cuenta de empresa", "Webhook de evento message_created"]
      },
      {
        id: "p4-5-yes",
        type: "branch_yes",
        branchLabel: "SÍ — Ha respondido",
        title: "Se detiene la secuencia",
        subtitle: "El sistema retira al contacto porque un vendedor pasará a atenderlo de forma manual.",
        api: ["Sheets"],
        details: ["Actualiza estado a 'contactado' en Sheets y fin de flujo"]
      },
      {
        id: "p4-5-no",
        type: "branch_no",
        branchLabel: "NO — Sin respuesta (48h)",
        title: "Se envía la Respuesta automatizada",
        subtitle: "Se selecciona la columna 'Respuesta N' que vaya emparejada con su 'Mensaje N' inicial.",
        api: ["Evolution API", "Sheets"],
        details: ["Dato: Columna 'Respuesta 1/2...10' asociada", "POST /v1/messages/send hacia el lead"]
      }
    ]
  },
  {
    id: "05",
    title: "Venta Cruzada",
    description: "Al catalogar un cliente como Venta Cruzada, la automatización busca en un Excel qué recomendar (Opción 1 o 2) dependiendo del producto comprado y las notas manuales de un agente.",
    apis: ["Odoo", "Evolution API", "Sheets"],
    steps: [
      {
        id: "p5-1",
        type: "trigger",
        title: "Marcamos al cliente como Venta Cruzada",
        subtitle: "El sistema se dispara cuando explícitamente se pone o etiqueta a un cliente para Venta Cruzada en Odoo.",
        api: ["Odoo", "n8n"],
        details: ["Trigger: Cambio de estado/etiqueta a 'Venta Cruzada'", "Lectura del campo del producto original comprado"]
      },
      {
        id: "p5-2",
        type: "decision",
        title: "¿Qué recomendación inteligente se aplica?",
        subtitle: "Mira en Excel: Producto Comprado -> Recomendado 1. Si en la casilla manual 'Observaciones' de Odoo han indicado que NO corresponde el Recomendado 1, pasa al Recomendado 2.",
        api: ["n8n", "Sheets", "Odoo"],
        details: ["Lookup en Excel por columnas: Comprado | Rec 1 | Rec 2", "Regla Inteligente analizando texto de sugerencias manuales del vendedor"]
      },
      {
        id: "p5-3",
        type: "api_call",
        title: "Se envía la recomendación por WhatsApp",
        subtitle: "Se envía el mensaje con el producto Recomendado final adaptado al escenario.",
        api: ["Evolution API"],
        details: ["Mensaje de Evolution API con la oferta validada"]
      },
      {
        id: "p5-4",
        type: "action",
        title: "Se marca como completado",
        subtitle: "Se registra la oferta enviada para no repetirla.",
        api: ["Odoo"],
        details: ["Acción: Marcar x_cross_sell_enviado = True en Odoo", "method: write"]
      }
    ]
  },
  {
    id: "06",
    title: "MVP Asistente WhatsApp (Barbacoa)",
    description: "Asistente de IA conversacional con planificador. Filtra lead en Odoo, añade a Sheets 'Números Barbacoa', consulta modelos en Google Sheets, planificador con preguntas, validación de presupuesto, y limpieza final de Sheets.",
    apis: ["Odoo", "Evolution API", "IA", "Sheets", "Gmail"],
    steps: [
      {
        id: "p6-1",
        type: "trigger",
        title: "Webhook Odoo + Filtro + Añadir a Sheets",
        subtitle: "Recibe el lead. Solo pasa si es 'Nuevo Lead' Y tiene tag 'barbacoa'. Si pasa, se añade su teléfono a la hoja 'Números Barbacoa' para aislarlo del flujo genérico.",
        api: ["Odoo", "n8n", "Sheets"],
        details: [
          "Webhook POST desde Odoo",
          "IF: stage_id.name == 'Nuevo Lead' AND tag_ids contiene 'barbacoa'",
          "False → NoOp (detener, no afectar otros flujos)",
          "True → Google Sheets: Append fila a 'Números Barbacoa' (teléfono, nombre, lead_id)"
        ]
      },
      {
        id: "p6-2",
        type: "action",
        title: "Obtener datos + Inicializar sesión",
        subtitle: "Extrae id, contact_name, phone, email del lead desde Odoo. Set: lead_id, phone, stage, followup_count=0.",
        api: ["Odoo", "n8n"],
        details: ["HTTP Request Odoo XML-RPC", "Set node: lead_id, phone, stage, followup_count"]
      },
      {
        id: "p6-3",
        type: "api_call",
        title: "Enviar catálogo + Registrar primer contacto",
        subtitle: "Evolution API: envía foto del catálogo con saludo personalizado. Odoo message_post: 'Primer contacto enviado vía WhatsApp.'",
        api: ["Evolution API", "Odoo"],
        details: ["POST /message/sendMedia (imagen + caption personalizado)", "message_post en Odoo"]
      },
      {
        id: "p6-4",
        type: "wait",
        title: "Esperar respuesta 24h (resume on webhook)",
        subtitle: "Wait node que pausa el flujo. Si responde → va a búsqueda de modelo en Sheets. Si expira → sistema de recordatorio.",
        api: ["n8n", "Evolution API"],
        details: ["Resume on Webhook", "Timeout: 24h", "Response → Buscar modelo en Sheets", "Timeout → Bloque recordatorio"]
      },
      {
        id: "p6-5",
        type: "decision",
        title: "Sistema de recordatorio (sin respuesta 24h)",
        subtitle: "Si expiró la espera inicial: IF followup_count==0 → enviar recordatorio WhatsApp + set count=1 + nueva espera 24h. Si count ya es 1 → Gmail alerta a comercial + quitar de Sheets.",
        api: ["Evolution API", "Gmail", "Sheets"],
        details: [
          "IF followup_count == 0: Recordatorio WhatsApp + nueva Wait 24h",
          "  → Si responde ahora: va a Buscar modelo en Sheets",
          "  → Si timeout otra vez: Gmail alerta + Quitar de 'Números Barbacoa' + Fin",
          "IF followup_count == 1: Gmail alerta + Quitar de Sheets + Fin"
        ]
      },
      {
        id: "p6-6",
        type: "api_call",
        title: "Buscar modelo en Google Sheets + enviar mensaje",
        subtitle: "Cuando el cliente dice qué modelo le interesa, se busca en la base de datos 'Modelos Barbacoa' en Google Sheets y se envía el mensaje correspondiente por WhatsApp.",
        api: ["Sheets", "Evolution API"],
        details: [
          "Google Sheets: Read/Lookup por nombre de modelo",
          "Extrae: precio, material, tamaño, descripción, mensaje_whatsapp",
          "Evolution API: POST /message/sendText con el mensaje del modelo"
        ]
      },
      {
        id: "p6-7",
        type: "ai",
        title: "AI Agent Planificador (GPT-4o)",
        subtitle: "Agente con 3 tools: BuscarInfoModelo (Sheets), RegistrarNotaOdoo, EvaluarPresupuesto (Sheets). Gestiona dudas y luego ejecuta el planificador de preguntas.",
        api: ["IA", "n8n", "Sheets", "Odoo"],
        details: [
          "Fase 1: Resolver dudas sobre el modelo (loop)",
          "Fase 2: Planificador - preguntas una a una:",
          "  P1: Tamaño (Pequeña, Mediana, Grande)",
          "  P2: Material (Inox, Fundición, Recomendación)",
          "  P3: Color/Estilo",
          "  P4: Extras (Tapa, Ruedas, Parrilla)",
          "  P5: Presupuesto aproximado",
          "Cada respuesta se guarda en Odoo vía tool RegistrarNotaOdoo",
          "Tool BuscarInfoModelo lee de Google Sheets (no hardcodeado)"
        ]
      },
      {
        id: "p6-8",
        type: "decision",
        title: "Validar presupuesto vs modelo",
        subtitle: "El agente compara el presupuesto del cliente con el precio real del modelo desde Sheets. Decide ruta: OK, recomendar más barato, o descartar.",
        api: ["IA", "Sheets"],
        details: [
          "Tool EvaluarPresupuesto: lee precios reales de Google Sheets",
          "Si presupuesto >= precio modelo → CUALIFICADO",
          "Si presupuesto < precio modelo: ¿Hay modelo más barato?",
          "  → Sí: Recomendar modelo económico X (loop)",
          "  → No: DESCARTADO - Marcar como Perdido + No cualificado en Odoo"
        ]
      },
      {
        id: "p6-9",
        type: "action",
        title: "Lead cualificado - Confirmación + Quitar de Sheets",
        subtitle: "WhatsApp: 'Genial, tenemos todo correcto. Enseguida un exteriorista te contestará.' Odoo: Stage 'Presupuesto Pendiente'. Sheets: Eliminar fila de 'Números Barbacoa'.",
        api: ["Evolution API", "Odoo", "Sheets"],
        details: [
          "Evolution API: Mensaje de confirmación final",
          "Odoo: Stage 'Presupuesto Pendiente'",
          "Google Sheets: Delete row de 'Números Barbacoa'"
        ]
      },
      {
        id: "p6-10",
        type: "action",
        title: "Lead descartado - Marcar perdido + Quitar de Sheets",
        subtitle: "Odoo: Stage 'Perdido' + Razón 'No cualificado - Precio'. Sheets: Eliminar fila de 'Números Barbacoa'. Fin del flujo.",
        api: ["Odoo", "Sheets"],
        details: [
          "Odoo: Stage 'Perdido' + lost_reason 'No cualificado - Precio'",
          "Google Sheets: Delete row de 'Números Barbacoa'"
        ]
      }
    ]
  },
  {
    id: "07",
    title: "Registro de leads desde meta",
    description: "Cada vez que un nuevo lead de Meta se añade a Google Sheets, se sube automáticamente a Odoo como nuevo lead.",
    apis: ["Sheets", "Odoo"],
    steps: [
      {
        id: "p7-1",
        type: "trigger",
        title: "Nuevo registro en Google Sheets",
        subtitle: "El sistema detecta cuando se añade una nueva fila en Google Sheets (proveniente de Meta).",
        api: ["Sheets", "n8n"],
        details: ["Trigger: On Row Added en Sheets", "Polling configurado para leer las nuevas filas añadidas"]
      },
      {
        id: "p7-2",
        type: "action",
        title: "Creación de lead en Odoo",
        subtitle: "Sube directamente el nuevo lead al CRM mapeando la información de la fila.",
        api: ["Odoo"],
        details: ["POST crear crm.lead", "Mapeo de campos: nombre, teléfono, email, etc."]
      }
    ]
  }
];

// --- COMPONENTS ---

const ApiBadge = ({ name }: { name: string }) => {
  const mapping: Record<string, { label: string, color: string }> = {
    Odoo: { label: "Odoo", color: "bg-[#92400E]" },
    "Evolution API": { label: "WhatsApp", color: "bg-[#065F46]" },
    Callbell: { label: "WhatsApp", color: "bg-[#065F46]" },
    Sheets: { label: "Base de datos", color: "bg-[#1E3A5F]" },
    Email: { label: "Email", color: "bg-[#4C1D95]" },
    n8n: { label: "Automatización", color: "bg-[#374151]" },
    IA: { label: "Asistente IA", color: "bg-[#7C3AED]" },
  };

  const info = mapping[name] || { label: name, color: "bg-gray-700" };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white cursor-help", info.color)}>
            {info.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 border-white/10 text-white text-[10px]">
          Herramienta técnica: {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ApiReferenceModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  const apis = [
    {
      name: "Evolution API",
      endpoints: [
        { method: "POST", url: "https://api.evolution-api.com/v1/messages/send", desc: "Enviar mensaje" },
        { method: "GET", url: "https://api.evolution-api.com/v1/messages/status/:uuid", desc: "Estado de mensaje" },
        { method: "GET", url: "https://api.evolution-api.com/v1/contacts", desc: "Listar contactos" },
        { method: "POST", url: "https://api.evolution-api.com/v1/contacts", desc: "Crear contacto" }
      ]
    },
    {
      name: "Odoo XML-RPC",
      endpoints: [
        { method: "POST", url: "{odoo_url}/xmlrpc/2/common", desc: "authenticate" },
        { method: "POST", url: "{odoo_url}/xmlrpc/2/object", desc: "execute_kw (CRUD)" }
      ]
    },
    {
      name: "Google Sheets",
      endpoints: [
        { method: "GET", url: "/v4/spreadsheets/{id}/values/{range}", desc: "Leer celdas" },
        { method: "PUT", url: "/v4/spreadsheets/{id}/values/{range}", desc: "Actualizar celdas" },
        { method: "POST", url: "/v4/spreadsheets/{id}/values/{range}:append", desc: "Añadir fila" }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0A1F5C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="text-[#1A56DB]" />
            <h3 className="text-xl font-bold text-white">Referencia técnica para el equipo de desarrollo</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-xs text-blue-200 leading-relaxed">
            <Info size={14} className="inline mr-2 mb-0.5" />
            Esta sección contiene los endpoints y modelos de datos necesarios para la implementación. No es necesaria para la validación del cliente.
          </div>
          {apis.map((api) => (
            <div key={api.name} className="space-y-4">
              <h4 className="text-sm font-bold text-[#1A56DB] uppercase tracking-widest">{api.name}</h4>
              <div className="space-y-2">
                {api.endpoints.map((ep, i) => (
                  <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 font-mono text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded font-bold",
                        ep.method === 'POST' ? 'bg-blue-500/20 text-blue-400' : 
                        ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 
                        'bg-amber-500/20 text-amber-400'
                      )}>
                        {ep.method}
                      </span>
                      <span className="text-slate-500">{ep.desc}</span>
                    </div>
                    <div className="text-slate-300 break-all">{ep.url}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FlowStep = ({ step, isBranch = false }: { step: any, isBranch?: boolean }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const config: Record<string, { emoji: string, label: string, color: string, bg: string }> = {
    trigger: { emoji: "🔔", label: "INICIO", color: "border-[#1A56DB]", bg: "bg-[#0A1F5C]" },
    action: { emoji: "✅", label: "ACCIÓN", color: "border-[#1A56DB]", bg: "bg-[#0f2744]" },
    wait: { emoji: "⏳", label: "ESPERA", color: "border-[#F59E0B]", bg: "bg-[#78350F22]" },
    decision: { emoji: "🔀", label: "CONDICIÓN", color: "border-[#7C3AED]", bg: "bg-[#312E8122]" },
    branch_yes: { emoji: "👍", label: "", color: "border-[#10B981]", bg: "bg-[#064E3B22]" },
    branch_no: { emoji: "👎", label: "", color: "border-[#EF4444]", bg: "bg-[#7F1D1D22]" },
    api_call: { emoji: "📤", label: "COMUNICACIÓN", color: "border-[#94A3B8]", bg: "bg-[#0f2744]" },
    ai: { emoji: "🤖", label: "ASISTENTE IA", color: "border-[#7C3AED]", bg: "bg-[#4C1D9522]" },
    end: { emoji: "🏁", label: "FIN", color: "border-[#10B981]", bg: "bg-[#064E3B]" },
  };

  const current = config[step.type] || config.action;

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto group", isBranch && "max-w-full")}>
      <div 
        className={cn(
          "relative z-10 p-4 rounded-xl border-l-4 transition-all duration-300",
          current.bg,
          current.color,
          "border-y border-r border-white/5 shadow-xl"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl", step.type === 'trigger' ? 'bg-white/20' : 'bg-[#1A56DB22]')}>
                {current.emoji}
              </div>
              {current.label && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{current.label}</span>}
            </div>
            <div>
              {step.branchLabel && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 inline-block",
                  step.type === 'branch_yes' ? 'bg-[#10B98122] text-[#10B981]' : 'bg-[#EF444422] text-[#EF4444]'
                )}>
                  {step.branchLabel}
                </span>
              )}
              <h4 className="font-bold text-slate-100 leading-tight text-base">
                {step.title}
              </h4>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex gap-1">
              {step.api?.map((a: string) => <ApiBadge key={a} name={a} />)}
            </div>
            <button 
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors group/btn"
            >
              {isDetailsOpen ? "Ocultar" : "Ver detalles técnicos"}
              {isDetailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} className="group-hover/btn:translate-y-0.5 transition-transform" />}
            </button>
          </div>
        </div>

        <div className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          isDetailsOpen ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="pt-4 border-t border-white/10 bg-black/20 -mx-4 px-4 pb-2">
            <p className="text-[10px] font-bold text-[#1A56DB] uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-base">🔧</span> Detalles técnicos
            </p>
            <ul className="space-y-2">
              {step.details?.map((detail: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="text-[#1A56DB]">›</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Connector = () => (
  <div className="flex flex-col items-center h-12">
    <div className="w-px h-full border-l-2 border-dotted border-[#1A56DB44]"></div>
    <div className="text-[#1A56DB] -mt-1">
      <ChevronDown size={16} />
    </div>
  </div>
);

const FlowDiagram = ({ steps }: { steps: any[] }) => {
  const renderedSteps = useMemo(() => {
    const result = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === 'decision') {
        result.push({ type: 'decision_group', decision: step, yes: steps[i+1], no: steps[i+2] });
        i += 2;
      } else {
        result.push(step);
      }
    }
    return result;
  }, [steps]);

  return (
    <div className="py-8 px-4 space-y-0">
      {renderedSteps.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.type === 'decision_group' ? (
            <>
              <FlowStep step={item.decision} />
              <div className="flex flex-col items-center h-12">
                <div className="w-px h-full border-l-2 border-dotted border-[#1A56DB44]"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto relative">
                <div className="hidden md:block absolute top-0 left-1/4 right-1/4 h-px border-t-2 border-dotted border-[#1A56DB44]"></div>
                <div className="flex flex-col items-center">
                  <div className="md:hidden w-px h-6 border-l-2 border-dotted border-[#1A56DB44]"></div>
                  <FlowStep step={item.yes} isBranch />
                </div>
                <div className="flex flex-col items-center">
                  <div className="md:hidden w-px h-6 border-l-2 border-dotted border-[#1A56DB44]"></div>
                  <FlowStep step={item.no} isBranch />
                </div>
              </div>
            </>
          ) : (
            <FlowStep step={item} />
          )}
          {idx < renderedSteps.length - 1 && <Connector />}
        </React.Fragment>
      ))}
      
      <div className="flex flex-col items-center mt-8">
        <Connector />
        <div className="bg-[#064E3B] text-white p-3 rounded-full shadow-lg shadow-emerald-900/20">
          <CheckCircle2 size={24} />
        </div>
        <span className="text-[10px] font-bold text-emerald-500 mt-2 tracking-widest uppercase">Fin del Proceso</span>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function Home() {
  const [activeId, setActiveId] = useState("01");
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const activeProject = PROJECTS.find(p => p.id === activeId) || PROJECTS[0];
  const totalSteps = PROJECTS.reduce((acc, p) => acc + p.steps.length, 0);

  const handleProjectChange = (id: string) => {
    if (id === activeId) return;
    setIsChanging(true);
    setTimeout(() => {
      setActiveId(id);
      setIsChanging(false);
    }, 300);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0d1b2a] text-slate-200 font-['Space_Grotesk'] selection:bg-[#1A56DB] selection:text-white">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        body {
          font-family: 'Space Grotesk', sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-[280px] bg-[#0A1F5C] border-r border-white/5 flex-col shrink-0 z-50">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-[#1A56DB] rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">Plan Automatización</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">AgenciaIA Solutions</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="px-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proyectos Activos</span>
          </div>
          {PROJECTS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProjectChange(p.id)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group",
                activeId === p.id 
                  ? "bg-[#1A56DB] text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center",
                  activeId === p.id ? "bg-white/20" : "bg-white/5"
                )}>
                  {p.id}
                </span>
                <span className="text-sm font-semibold text-left">{p.title}</span>
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-bold",
                activeId === p.id ? "bg-white/20" : "bg-white/5"
              )}>
                {p.steps.length}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-6 bg-black/20 border-t border-white/5 space-y-4">
          <button 
            onClick={() => setIsApiModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all border border-white/5"
          >
            <Code2 size={14} className="text-[#1A56DB]" />
            VER TODAS LAS APIs
          </button>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>{PROJECTS.length} AUTOMATIZACIONES</span>
            <span>{totalSteps} PASOS TOTALES</span>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & NAV */}
      <div className="md:hidden bg-[#0A1F5C] border-b border-white/5 p-4 sticky top-0 z-[60]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-[#1A56DB]" />
            <h1 className="font-bold text-sm text-white">Plan Automatización</h1>
          </div>
          <button onClick={() => setIsApiModalOpen(true)} className="p-2 bg-white/5 rounded-lg">
            <Code2 size={16} className="text-[#1A56DB]" />
          </button>
        </div>
        <div className="relative">
          <select 
            value={activeId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full bg-[#0d1b2a] border border-white/10 rounded-xl p-3 text-sm font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]"
          >
            {PROJECTS.map(p => (
              <option key={p.id} value={p.id}>{p.id} - {p.title}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isChanging ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}>
          {/* HEADER */}
          <header className="p-8 md:p-12 bg-gradient-to-b from-[#0f2744] to-transparent">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1A56DB22] text-[#1A56DB] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Proyecto {activeProject.id}</span>
                    <div className="h-px w-8 bg-white/10"></div>
                    <div className="flex gap-1">
                      {activeProject.apis.map(a => <ApiBadge key={a} name={a} />)}
                    </div>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{activeProject.title}</h2>
                  <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">{activeProject.description}</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Complejidad</p>
                    <p className="text-sm font-bold text-white">{activeProject.steps.length} Pasos Lógicos</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-[#1A56DB22] border-t-[#1A56DB] flex items-center justify-center text-xs font-bold">
                    {Math.round((activeProject.steps.length / 8) * 100)}%
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="mt-12 flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {activeProject.steps.map((_, i) => (
                  <React.Fragment key={i}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500",
                      "bg-[#1A56DB] text-white shadow-lg shadow-blue-900/20"
                    )}>
                      {i + 1}
                    </div>
                    {i < activeProject.steps.length - 1 && (
                      <div className="w-8 md:flex-1 h-0.5 bg-gradient-to-r from-[#1A56DB] to-[#1A56DB22] shrink-0"></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </header>

          {/* DIAGRAM AREA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
            <div className="max-w-5xl mx-auto">
              <FlowDiagram steps={activeProject.steps} />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-[#0A1F5C] border-t border-white/5 p-4 flex items-center justify-between text-xs text-slate-400 font-medium z-50">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#1A56DB]" />
            <span className="hidden sm:inline">Documento de validación · Sujeto a confirmación del cliente</span>
            <span className="sm:hidden">Doc. Validación</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
              AgenciaIA Solutions <ExternalLink size={12} />
            </a>
          </div>
        </footer>
      </main>

      {/* API MODAL */}
      <ApiReferenceModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
    </div>
  );
}