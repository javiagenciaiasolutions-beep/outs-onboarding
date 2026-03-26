"use client";

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  ArrowRight, 
  Clock, 
  GitBranch, 
  CheckCircle2, 
  XCircle, 
  Link2, 
  Bot, 
  ChevronDown, 
  ChevronRight, 
  Info,
  Database,
  MessageSquare,
  Table,
  Mail,
  LayoutDashboard,
  ExternalLink
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- CONSTANTS & DATA ---

const PROJECTS = [
  {
    id: "01",
    title: "Nuevo Lead",
    description: "Flujo de bienvenida multietapa para nuevos contactos en Odoo",
    apis: ["Odoo", "n8n", "Callbell", "Email"],
    steps: [
      {
        id: "p1-1",
        type: "trigger",
        title: "Nuevo contacto creado en Odoo",
        subtitle: "n8n detecta nuevo registro en crm.lead o res.partner",
        api: ["Odoo", "n8n"],
        details: ["Polling cada 10 minutos", "Modelo: crm.lead / res.partner", "Filtro: create_date >= last_check"]
      },
      {
        id: "p1-2",
        type: "action",
        title: "Enviar email de aviso al equipo",
        subtitle: "Notificación interna: 'Nuevo lead: [Nombre], [Teléfono]'",
        api: ["Email"],
        details: ["Nodo Email de n8n", "Destinatario: email del equipo configurado"]
      },
      {
        id: "p1-3",
        type: "wait",
        title: "Esperar X minutos",
        subtitle: "Pausa antes de contactar al cliente por WhatsApp",
        api: ["n8n"],
        details: ["Wait node de n8n", "Tiempo configurable (recomendado: 5-10 min)"]
      },
      {
        id: "p1-4",
        type: "api_call",
        title: "POST /v1/messages/send → WhatsApp bienvenida",
        subtitle: "Mensaje solicitando fotos y vídeos del exterior",
        api: ["Callbell"],
        details: [
          "type: 'text'", 
          "to: teléfono del contacto (E.164)",
          "Texto: bienvenida + solicitud de material fotográfico"
        ]
      },
      {
        id: "p1-5",
        type: "wait",
        title: "Esperar 1 día laborable",
        subtitle: "Ventana para que el cliente envíe el material",
        api: ["n8n"],
        details: ["Wait node + lógica de días laborables", "Excluye sábados, domingos y festivos"]
      },
      {
        id: "p1-6",
        type: "decision",
        title: "¿Ha respondido el cliente?",
        subtitle: "Verificar si llegó mensaje o adjunto por WhatsApp",
        api: ["Callbell"],
        details: ["Webhook entrante de Callbell", "Verificar en Odoo si x_material_recibido = True"]
      },
      {
        id: "p1-7-yes",
        type: "branch_yes",
        branchLabel: "SÍ — Ha enviado material",
        title: "Descargar y adjuntar archivos a Odoo",
        subtitle: "n8n descarga archivos desde URL Callbell y los sube a Odoo",
        api: ["Callbell", "Odoo"],
        details: [
          "GET archivo desde attachments[].url de Callbell",
          "Convertir a Base64",
          "POST ir.attachment en Odoo con res_model: crm.lead",
          "Actualizar x_material_recibido = True"
        ]
      },
      {
        id: "p1-7-no",
        type: "branch_no",
        branchLabel: "NO — Sin respuesta",
        title: "Enviar recordatorio de texto",
        subtitle: "Segundo intento por WhatsApp",
        api: ["Callbell"],
        details: ["POST /v1/messages/send tipo text", "Texto de recordatorio amable"]
      },
      {
        id: "p1-8",
        type: "api_call",
        title: "POST mail.message → Log conversación en Odoo",
        subtitle: "Registrar cada mensaje enviado/recibido en el hilo del lead",
        api: ["Odoo"],
        details: [
          "model: mail.message",
          "method: create",
          "body: contenido del mensaje",
          "res_id: ID del crm.lead"
        ]
      }
    ]
  },
  {
    id: "02",
    title: "Valoración",
    description: "Solicitud automática de reseña cuando el equipo marca la casilla",
    apis: ["Odoo", "Callbell"],
    steps: [
      {
        id: "p2-1",
        type: "trigger",
        title: "Campo 'Valoración' marcado en Odoo",
        subtitle: "n8n detecta x_valoracion = True y x_valoracion_wa_enviado = False",
        api: ["Odoo", "n8n"],
        details: ["Polling cada 15 minutos", "Modelo: res.partner o crm.lead", "Doble filtro para evitar reenvíos"]
      },
      {
        id: "p2-2",
        type: "api_call",
        title: "POST /v1/messages/send → WhatsApp con enlace de reseña",
        subtitle: "Mensaje con enlace a Google Reviews u otra plataforma",
        api: ["Callbell"],
        details: [
          "type: 'text' (si dentro de 24h) o 'template' (si fuera de 24h)",
          "Incluir enlace a plataforma de reseñas",
          "Guardar uuid de respuesta de Callbell"
        ]
      },
      {
        id: "p2-3",
        type: "action",
        title: "Marcar como enviado en Odoo",
        subtitle: "Prevenir reenvíos duplicados",
        api: ["Odoo"],
        details: [
          "method: write",
          "x_valoracion_wa_enviado = True",
          "x_valoracion_fecha_envio = timestamp actual"
        ]
      }
    ]
  },
  {
    id: "03",
    title: "Packs Mantenimiento",
    description: "Upsell automático de mantenimiento 4 días después de instalar césped",
    apis: ["Odoo", "Callbell"],
    steps: [
      {
        id: "p3-1",
        type: "trigger",
        title: "Cliente de césped marcado como instalado",
        subtitle: "n8n detecta x_instalado = True y x_pack_enviado = False",
        api: ["Odoo", "n8n"],
        details: ["Polling cada hora", "Filtro por tag/categoría: 'cesped'", "Guarda fecha_instalacion para calcular D+4"]
      },
      {
        id: "p3-2",
        type: "wait",
        title: "Esperar 4 días naturales",
        subtitle: "Calcular: fecha_instalacion + 4 días = fecha de envío",
        api: ["n8n"],
        details: ["Wait node con fecha absoluta", "Alternativa: cola en Sheets con fecha_envio programada"]
      },
      {
        id: "p3-3",
        type: "api_call",
        title: "POST /v1/messages/send → WhatsApp packs mantenimiento",
        subtitle: "Oferta de mantenimiento específica para césped",
        api: ["Callbell"],
        details: [
          "type: 'image' (si incluye catálogo) o 'text'",
          "content.url: URL pública de imagen del catálogo",
          "OBLIGATORIO: usar template si han pasado >24h"
        ]
      },
      {
        id: "p3-4",
        type: "action",
        title: "Marcar x_pack_enviado = True en Odoo",
        subtitle: "Evitar reenvíos en siguientes ejecuciones del cron",
        api: ["Odoo"],
        details: ["method: write sobre sale.order o crm.lead", "x_pack_enviado = True", "x_pack_fecha_envio = timestamp"]
      }
    ]
  },
  {
    id: "04",
    title: "BBDD Arquitectos",
    description: "Secuencia de prospección a arquitectos desde Google Sheets",
    apis: ["Sheets", "Callbell"],
    steps: [
      {
        id: "p4-1",
        type: "trigger",
        title: "Estado = 'pendiente' en Google Sheets",
        subtitle: "El equipo cambia manualmente el estado de un arquitecto a 'pendiente'",
        api: ["Sheets", "n8n"],
        details: [
          "Polling cada 15 minutos",
          "GET /v4/spreadsheets/{id}/values/Sheet1",
          "Filtrar filas donde columna Estado = 'pendiente' y WA_enviado_1 = vacío"
        ]
      },
      {
        id: "p4-2",
        type: "api_call",
        title: "POST /v1/messages/send → Mensaje 1",
        subtitle: "Enviar el contenido de la columna 'Mensaje' del Sheet",
        api: ["Callbell"],
        details: ["type: 'text'", "content.text: valor de columna 'Mensaje' de esa fila", "Guardar uuid de Callbell"]
      },
      {
        id: "p4-3",
        type: "action",
        title: "Actualizar WA_enviado_1 = timestamp en Sheets",
        subtitle: "Marcar que el primer mensaje fue enviado y cuándo",
        api: ["Sheets"],
        details: ["PUT /v4/spreadsheets/{id}/values/{range}", "Columna WA_enviado_1 = ISO timestamp", "Estado → 'enviado_1'"]
      },
      {
        id: "p4-4",
        type: "wait",
        title: "Esperar 2 días sin respuesta",
        subtitle: "n8n verifica si WA_enviado_1 + 2 días <= ahora y WA_enviado_2 vacío",
        api: ["n8n", "Callbell"],
        details: ["Polling compara timestamp de WA_enviado_1", "Si Callbell webhook detecta respuesta → actualizar estado a 'contestado' y parar"]
      },
      {
        id: "p4-5",
        type: "decision",
        title: "¿Ha contestado el arquitecto?",
        subtitle: "Verificar si llegó mensaje entrante de ese número",
        api: ["Callbell"],
        details: ["Webhook message_created de Callbell", "Comparar número de teléfono con filas del Sheet"]
      },
      {
        id: "p4-5-yes",
        type: "branch_yes",
        branchLabel: "SÍ — Ha respondido",
        title: "Actualizar estado = 'contestado' en Sheets",
        subtitle: "Fin del flujo automatizado para este contacto",
        api: ["Sheets"],
        details: ["PUT estado = 'contestado'", "Registrar timestamp de respuesta"]
      },
      {
        id: "p4-5-no",
        type: "branch_no",
        branchLabel: "NO — Sin respuesta tras 2 días",
        title: "POST /v1/messages/send → Mensaje 2",
        subtitle: "Enviar el contenido de la columna 'Mensaje 2' del Sheet",
        api: ["Callbell", "Sheets"],
        details: ["type: 'text'", "content.text: columna 'Mensaje 2'", "Actualizar WA_enviado_2 = timestamp", "Estado → 'enviado_2'"]
      }
    ]
  },
  {
    id: "05",
    title: "Venta Cruzada",
    description: "Mensaje de cross-sell automático según producto comprado (5 productos)",
    apis: ["Odoo", "Callbell"],
    steps: [
      {
        id: "p5-1",
        type: "trigger",
        title: "Pedido completado/instalado en Odoo",
        subtitle: "n8n detecta sale.order con x_instalado = True y x_cross_sell_enviado = False",
        api: ["Odoo", "n8n"],
        details: ["Polling cada 30 minutos", "Modelo: sale.order", "Leer líneas: sale.order.line para detectar producto"]
      },
      {
        id: "p5-2",
        type: "decision",
        title: "¿Qué producto se compró?",
        subtitle: "Switch node en n8n: 5 ramas según producto",
        api: ["n8n"],
        details: [
          "Switch node con 5 ramas",
          "Producto 1: mensaje cross-sell específico A",
          "Producto 2: mensaje cross-sell específico B",
          "Producto 3: mensaje cross-sell específico C",
          "Producto 4: mensaje cross-sell específico D",
          "Producto 5: mensaje cross-sell específico E"
        ]
      },
      {
        id: "p5-3",
        type: "api_call",
        title: "POST /v1/messages/send → WA cross-sell por producto",
        subtitle: "Mensaje personalizado según el producto adquirido",
        api: ["Callbell"],
        details: [
          "type: 'text' o 'template' según ventana 24h",
          "Contenido diferente para cada uno de los 5 productos",
          "Puede incluir imagen del producto complementario"
        ]
      },
      {
        id: "p5-4",
        type: "action",
        title: "Marcar x_cross_sell_enviado = True en Odoo",
        subtitle: "Registrar qué producto generó el cross-sell",
        api: ["Odoo"],
        details: ["method: write", "x_cross_sell_enviado = True", "x_cross_sell_producto = nombre del producto detectado"]
      }
    ]
  },
  {
    id: "06",
    title: "Lead Scoring Barbacoa",
    description: "Cualificación conversacional de leads de barbacoa con IA restrictiva",
    apis: ["Odoo", "Callbell", "IA"],
    steps: [
      {
        id: "p6-1",
        type: "trigger",
        title: "Nuevo lead de barbacoa en Odoo",
        subtitle: "n8n detecta crm.lead con tag/categoría = 'barbacoa'",
        api: ["Odoo", "n8n"],
        details: ["Polling sobre crm.lead", "Filtro por tag_ids que incluya 'barbacoa'", "x_personalizador_estado = null (no iniciado)"]
      },
      {
        id: "p6-2",
        type: "api_call",
        title: "POST /v1/messages/send → Bienvenida + Modelos y FAQs",
        subtitle: "Primer contacto: presentación y respuesta a preguntas frecuentes",
        api: ["Callbell"],
        details: [
          "type: 'text'",
          "Mensaje de bienvenida",
          "Info sobre los modelos disponibles",
          "Respuesta a FAQs más comunes"
        ]
      },
      {
        id: "p6-3",
        type: "ai",
        title: "FASE 1: Lead Scoring — Preguntas de cualificación",
        subtitle: "El sistema envía preguntas para evaluar presupuesto, urgencia e intención",
        api: ["Callbell", "Odoo"],
        details: [
          "Preguntas: presupuesto disponible, tipo de instalación, urgencia",
          "Respuestas libres (el cliente puede responder como quiera)",
          "Puntuación acumulada en x_lead_score",
          "Estado: x_personalizador_estado = 'scoring'"
        ]
      },
      {
        id: "p6-4",
        type: "decision",
        title: "¿Lead cualificado? (score >= umbral)",
        subtitle: "Evaluar si el lead tiene suficiente score para pasar al personalizador",
        api: ["n8n"],
        details: ["Umbral configurable (ej: score >= 6 sobre 10)", "Si no cualifica → enviar mensaje de seguimiento manual"]
      },
      {
        id: "p6-4-no",
        type: "branch_no",
        branchLabel: "NO — Score bajo",
        title: "Notificar al equipo para seguimiento manual",
        subtitle: "El lead no cumple criterios de cualificación automática",
        api: ["Odoo"],
        details: ["Actualizar etapa en pipeline: 'No cualificado'", "Crear tarea/actividad en Odoo para seguimiento manual"]
      },
      {
        id: "p6-4-yes",
        type: "branch_yes",
        branchLabel: "SÍ — Lead cualificado",
        title: "FASE 2: Personalizador — Preguntas CERRADAS",
        subtitle: "El sistema SOLO acepta las respuestas válidas definidas por pregunta",
        api: ["Callbell", "Odoo"],
        details: [
          "x_personalizador_estado = 'en_curso'",
          "x_personalizador_step = 0 (pregunta actual)",
          "REGLA CRÍTICA: si respuesta no es válida → repreguntar",
          "Ejemplo: '¿Chimenea derecha o izquierda?' → solo acepta 'Derecha' / 'Izquierda'",
          "Cada respuesta se guarda como nota en crm.lead"
        ]
      },
      {
        id: "p6-5",
        type: "action",
        title: "Guardar configuración completa en Odoo",
        subtitle: "Todas las respuestas del personalizador quedan registradas",
        api: ["Odoo"],
        details: [
          "method: create en mail.message (notas internas)",
          "x_personalizador_estado = 'completado'",
          "Etapa del pipeline → 'Cualificado'"
        ]
      },
      {
        id: "p6-6",
        type: "api_call",
        title: "POST /v1/messages/send → Resumen de configuración",
        subtitle: "Enviar al cliente el resumen completo de su barbacoa personalizada",
        api: ["Callbell"],
        details: [
          "Mensaje con todas las opciones elegidas",
          "Próximos pasos (visita, presupuesto formal, etc.)",
          "type: 'text'"
        ]
      }
    ]
  }
];

// --- COMPONENTS ---

const ApiBadge = ({ name }: { name: string }) => {
  const styles: Record<string, string> = {
    Odoo: "bg-[#92400E] text-white",
    Callbell: "bg-[#065F46] text-white",
    Sheets: "bg-[#1E3A5F] text-white",
    Email: "bg-[#4C1D95] text-white",
    n8n: "bg-[#374151] text-white",
    IA: "bg-[#7C3AED] text-white",
  };

  const icons: Record<string, React.ReactNode> = {
    Odoo: <Database size={10} />,
    Callbell: <MessageSquare size={10} />,
    Sheets: <Table size={10} />,
    Email: <Mail size={10} />,
    n8n: <Zap size={10} />,
    IA: <Bot size={10} />,
  };

  return (
    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider", styles[name] || "bg-gray-700 text-gray-300")}>
      {icons[name]} {name}
    </span>
  );
};

const FlowStep = ({ step, isBranch = false }: { step: any, isBranch?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  const config: Record<string, any> = {
    trigger: { icon: <Zap size={18} />, color: "border-[#1A56DB]", bg: "bg-[#1A56DB]" },
    action: { icon: <ArrowRight size={18} />, color: "border-[#1A56DB]", bg: "bg-[#0f2744]" },
    wait: { icon: <Clock size={18} />, color: "border-[#F59E0B]", bg: "bg-[#78350F22]" },
    decision: { icon: <GitBranch size={18} />, color: "border-[#7C3AED]", bg: "bg-[#312E8122]" },
    branch_yes: { icon: <CheckCircle2 size={18} />, color: "border-[#10B981]", bg: "bg-[#064E3B22]" },
    branch_no: { icon: <XCircle size={18} />, color: "border-[#EF4444]", bg: "bg-[#7F1D1D22]" },
    api_call: { icon: <Link2 size={18} />, color: "border-[#94A3B8]", bg: "bg-[#0f2744]" },
    ai: { icon: <Bot size={18} />, color: "border-[#7C3AED]", bg: "bg-[#4C1D9522]" },
    end: { icon: <CheckCircle2 size={18} />, color: "border-[#10B981]", bg: "bg-[#064E3B]" },
  };

  const current = config[step.type] || config.action;

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto group", isBranch && "max-w-full")}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative z-10 p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-300 hover:translate-x-1",
          current.bg,
          current.color,
          "border-y border-r border-white/5 shadow-xl"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("p-2 rounded-lg text-white", step.type === 'trigger' ? 'bg-white/20' : 'bg-[#1A56DB22]')}>
              {current.icon}
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
              <h4 className={cn(
                "font-bold text-slate-100 leading-tight",
                step.type === 'api_call' && "font-mono text-sm"
              )}>
                {step.title}
              </h4>
              <p className="text-sm text-slate-400 mt-1">{step.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1">
              {step.api?.map((a: string) => <ApiBadge key={a} name={a} />)}
            </div>
            {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
          </div>
        </div>

        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="pt-4 border-t border-white/10">
            <ul className="space-y-2">
              {step.details?.map((detail: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300 font-mono">
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
  // Logic to group branches after a decision
  const renderedSteps = useMemo(() => {
    const result = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === 'decision') {
        result.push({ type: 'decision_group', decision: step, yes: steps[i+1], no: steps[i+2] });
        i += 2; // Skip the next two as they are branches
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
                {/* Branch Connectors */}
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

export default function App() {
  const [activeId, setActiveId] = useState("01");
  const activeProject = PROJECTS.find(p => p.id === activeId) || PROJECTS[0];

  const totalSteps = PROJECTS.reduce((acc, p) => acc + p.steps.length, 0);

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
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-full md:w-[280px] bg-[#0A1F5C] border-r border-white/5 flex flex-col shrink-0 z-50">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-[#1A56DB] rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">Plan Automatización</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">Jorge Luján · jorgelujan.org</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="px-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proyectos Activos</span>
          </div>
          {PROJECTS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
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

        <div className="p-6 bg-black/20 border-t border-white/5">
          <div className="mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">APIs Utilizadas</span>
            <div className="flex flex-wrap gap-2">
              <ApiBadge name="Odoo" />
              <ApiBadge name="Callbell" />
              <ApiBadge name="Sheets" />
              <ApiBadge name="n8n" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>{PROJECTS.length} AUTOMATIZACIONES</span>
            <span>{totalSteps} PASOS TOTALES</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
            <div className="mt-12 flex items-center gap-2">
              {activeProject.steps.map((_, i) => (
                <React.Fragment key={i}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
                    "bg-[#1A56DB] text-white shadow-lg shadow-blue-900/20"
                  )}>
                    {i + 1}
                  </div>
                  {i < activeProject.steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-[#1A56DB] to-[#1A56DB22]"></div>
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

        {/* FOOTER */}
        <footer className="bg-[#0A1F5C] border-t border-white/5 p-4 flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#1A56DB]" />
            <span>Documento de validación · Sujeto a confirmación del cliente</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://jorgelujan.org" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              jorgelujan.org <ExternalLink size={12} />
            </a>
          </div>
        </footer>
      </main>

      <style jsx>{`
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
    </div>
  );
}