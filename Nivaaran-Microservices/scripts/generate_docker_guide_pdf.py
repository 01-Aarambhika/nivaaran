"""
generate_docker_guide_pdf.py
Generates a publication-quality, professional Docker Deployment & Execution Guide PDF for Nivaaran.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        # Suppress on cover page (page 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            # Header
            self.drawString(16 * mm, 285 * mm, "Nivaaran Campus Grievance Redressal — Docker Deployment & Operations Guide")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(16 * mm, 283 * mm, 194 * mm, 283 * mm)

            # Footer
            self.line(16 * mm, 16 * mm, 194 * mm, 16 * mm)
            self.drawString(16 * mm, 12 * mm, "IIIT Vadodara • Computer Science & Engineering")
            page_str = f"Page {self._pageNumber} of {total_pages}"
            self.drawRightString(194 * mm, 12 * mm, page_str)
        self.restoreState()

def build_pdf(filename="Nivaaran_Docker_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm
    )

    styles = getSampleStyleSheet()

    # Custom palette
    PRIMARY = colors.HexColor("#1d4ed8")   # Deep cobalt blue
    DARK = colors.HexColor("#0f172a")      # Slate 900
    MUTED = colors.HexColor("#475569")     # Slate 600
    LIGHT_BG = colors.HexColor("#f8fafc")  # Slate 50
    BORDER = colors.HexColor("#e2e8f0")    # Slate 200
    CODE_BG = colors.HexColor("#0f172a")   # Dark code block bg

    # Custom typography styles
    style_cover_badge = ParagraphStyle(
        'CoverBadge',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=PRIMARY,
        spaceAfter=14
    )
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=30,
        textColor=DARK,
        spaceAfter=10
    )
    style_cover_sub = ParagraphStyle(
        'CoverSub',
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=MUTED,
        spaceAfter=20
    )
    style_h1 = ParagraphStyle(
        'SectionH1',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=DARK,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    style_h2 = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    style_body = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=9.2,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6
    )
    style_body_bold = ParagraphStyle(
        'BodyBold',
        parent=style_body,
        fontName='Helvetica-Bold'
    )
    style_code = ParagraphStyle(
        'CodeBlock',
        fontName='Courier',
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#f8fafc"),
        spaceBefore=3,
        spaceAfter=6
    )
    style_callout = ParagraphStyle(
        'CalloutText',
        fontName='Helvetica',
        fontSize=8.75,
        leading=12.5,
        textColor=colors.HexColor("#0369a1")
    )
    style_table_header = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=10.5,
        textColor=DARK
    )
    style_table_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#334155")
    )
    style_table_code = ParagraphStyle(
        'TableCode',
        fontName='Courier-Bold',
        fontSize=7.8,
        leading=10,
        textColor=PRIMARY
    )

    story = []

    # ─────────────────────────────────────────────────────────────────────────
    # COVER PAGE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph("OFFICIAL DEPLOYMENT & OPERATIONS MANUAL", style_cover_badge))
    story.append(Paragraph("Nivaaran Platform:<br/><font color='#1d4ed8'>Single-Command Docker Deployment</font>", style_cover_title))
    story.append(Paragraph("Complete Step-by-Step Guide for Running All 6 Microservices, Isolated MySQL 8.0 Databases, and the React Frontend Client", style_cover_sub))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=5, spaceAfter=20))

    meta_data = [
        [Paragraph("<b>Project:</b> Nivaaran (Campus Redressal)", style_body), Paragraph("<b>Target Environment:</b> Docker Desktop / Compose v2+", style_body)],
        [Paragraph("<b>Institute:</b> IIIT Vadodara", style_body), Paragraph("<b>Architecture:</b> 6 Microservices + MySQL + React Client", style_body)],
        [Paragraph("<b>Team:</b> Aarambhika (1001), Abhishek (1006), Ritik (1078)", style_body), Paragraph("<b>Master Command:</b> <font color='#1d4ed8'><b>docker compose up --build</b></font>", style_body)],
        [Paragraph("<b>Deliverable Date:</b> November 2026", style_body), Paragraph("<b>Status:</b> Production Ready & Tested", style_body)]
    ]
    meta_table = Table(meta_data, colWidths=[89 * mm, 89 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 25 * mm))
    story.append(Paragraph("<b>Executive Summary:</b><br/>Nivaaran addresses informal and lost grievances across the IIIT Vadodara campus through an enterprise microservice architecture. This document provides an exhaustive, unambiguous manual for reproducing the full containerized platform on any machine in minutes.", style_body))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 1: ARCHITECTURE & TOPOLOGY
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("1. Container Topology & Port Allocations", style_h1))
    story.append(Paragraph("The system consists of 8 interconnected Docker containers orchestrated via a single <code>docker-compose.yml</code> file. Each service strictly owns its database boundary, preventing direct cross-database access:", style_body))

    topology_data = [
        [Paragraph("Service", style_table_header), Paragraph("Container Role", style_table_header), Paragraph("Host Port", style_table_header), Paragraph("Database / Storage", style_table_header), Paragraph("Healthcheck", style_table_header)],
        [Paragraph("<b>mysql</b>", style_table_cell), Paragraph("MySQL 8.0 Server", style_table_cell), Paragraph("<code>3306</code>", style_table_code), Paragraph("6 isolated schemas", style_table_cell), Paragraph("mysqladmin ping", style_table_cell)],
        [Paragraph("<b>accounts</b>", style_table_cell), Paragraph("Auth, JWT & Users", style_table_cell), Paragraph("<code>8080</code>", style_table_code), Paragraph("nivaaran_accounts", style_table_cell), Paragraph("HTTP :8080/users", style_table_cell)],
        [Paragraph("<b>directory</b>", style_table_cell), Paragraph("Categories, SLA limits", style_table_cell), Paragraph("<code>8081</code>", style_table_code), Paragraph("nivaaran_directory", style_table_cell), Paragraph("HTTP :8081/categories", style_table_cell)],
        [Paragraph("<b>complaints</b>", style_table_cell), Paragraph("Grievance Lifecycle", style_table_cell), Paragraph("<code>8082</code>", style_table_code), Paragraph("nivaaran_complaints", style_table_cell), Paragraph("HTTP :8082/complaints", style_table_cell)],
        [Paragraph("<b>resolution</b>", style_table_cell), Paragraph("Duty Roster & Assign", style_table_cell), Paragraph("<code>8083</code>", style_table_code), Paragraph("nivaaran_resolution", style_table_cell), Paragraph("HTTP :8083/roster", style_table_cell)],
        [Paragraph("<b>notifications</b>", style_table_cell), Paragraph("Alert Log & SMS Gateway", style_table_cell), Paragraph("<code>8084</code>", style_table_code), Paragraph("nivaaran_notifications", style_table_cell), Paragraph("HTTP :8084/notifications", style_table_cell)],
        [Paragraph("<b>analytics</b>", style_table_cell), Paragraph("Audit & SLA Telemetry", style_table_cell), Paragraph("<code>8085</code>", style_table_code), Paragraph("nivaaran_analytics", style_table_cell), Paragraph("HTTP :8085/audit/events", style_table_cell)],
        [Paragraph("<b>client</b>", style_table_cell), Paragraph("React SPA Frontend", style_table_cell), Paragraph("<code>5173</code>", style_table_code), Paragraph("REST API Consumer", style_table_cell), Paragraph("HTTP :5173 (serve)", style_table_cell)]
    ]
    top_table = Table(topology_data, colWidths=[24 * mm, 44 * mm, 20 * mm, 46 * mm, 44 * mm])
    top_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(top_table)

    story.append(Spacer(1, 4 * mm))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 2: PREREQUISITES
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("2. Prerequisites & Verification", style_h1))
    story.append(Paragraph("Before executing Docker commands, verify that Docker Engine and Docker Compose are operational on your host machine:", style_body))

    code_prereq = [
        [Paragraph("<b># 1. Verify Docker Engine and Compose Installation</b><br/>"
                   "docker --version<br/>"
                   "docker compose version<br/><br/>"
                   "<b># Expected:</b> Docker version 24.0+ and Docker Compose v2.20+", style_code)]
    ]
    t_prereq = Table(code_prereq, colWidths=[178 * mm])
    t_prereq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CODE_BG),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1e293b")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_prereq)

    story.append(Spacer(1, 4 * mm))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 3: STEP-BY-STEP LAUNCH GUIDE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("3. Step-by-Step Single-Command Launch", style_h1))

    steps_text = [
        "<b>Step 1: Open Terminal & Change to Project Root</b><br/>"
        "Ensure you are in the workspace folder containing <code>docker-compose.yml</code>.",
        "<b>Step 2: Execute Master Compose Build & Run</b><br/>"
        "Run the build command. Docker Compose will automatically compile the Node 20 microservice images, the React frontend Vite bundle, and pull the official MySQL 8.0 image:",
    ]
    for s in steps_text:
        story.append(Paragraph(s, style_body))

    code_run = [
        [Paragraph("<b># Launch all 8 containers in foreground (live logs visible):</b><br/>"
                   "docker compose up --build<br/><br/>"
                   "<b># OR launch in background (detached daemon mode):</b><br/>"
                   "docker compose up --build -d", style_code)]
    ]
    t_run = Table(code_run, colWidths=[178 * mm])
    t_run.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CODE_BG),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1e293b")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_run)

    story.append(Paragraph("<b>Step 3: Monitor Healthchecks & Startup Sequencing</b><br/>"
                           "The startup follows a strict conditional graph: <code>mysql</code> initialises databases using <code>database/init_mysql.sql</code> &rarr; microservices wait until MySQL ping succeeds &rarr; the React client launches once backend services are ready.", style_body))

    code_ps = [
        [Paragraph("<b># Check live container health status:</b><br/>"
                   "docker compose ps", style_code)]
    ]
    t_ps = Table(code_ps, colWidths=[178 * mm])
    t_ps.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CODE_BG),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1e293b")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_ps)

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 4: ACCESSING APPLICATION & ROLES
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("4. Accessing Application & Demo Roles", style_h1))
    story.append(Paragraph("Once the containers display healthy, open your web browser and navigate to <b>http://localhost:5173</b>. The platform includes pre-seeded accounts for every persona:", style_body))

    cred_data = [
        [Paragraph("Role Persona", style_table_header), Paragraph("User ID", style_table_header), Paragraph("Password", style_table_header), Paragraph("Department Scope", style_table_header), Paragraph("Key Functional Capabilities", style_table_header)],
        [Paragraph("<b>Student</b>", style_table_cell), Paragraph("<code>20251651078</code>", style_table_code), Paragraph("<code>demo123</code>", style_table_cell), Paragraph("All Campus", style_table_cell), Paragraph("File grievances, toggle anonymity, track SLAs, comment, withdraw unassigned, rate/reopen", style_table_cell)],
        [Paragraph("<b>Hostel Warden</b>", style_table_cell), Paragraph("<code>W101</code>", style_table_code), Paragraph("<code>warden123</code>", style_table_cell), Paragraph("Hostel", style_table_cell), Paragraph("Hostel queue only; start physical work, post updates, mark resolved", style_table_cell)],
        [Paragraph("<b>Mess In-Charge</b>", style_table_cell), Paragraph("<code>M201</code>", style_table_code), Paragraph("<code>mess123</code>", style_table_cell), Paragraph("Mess", style_table_cell), Paragraph("Mess queue only; food quality, kitchen hygiene, catering redressal", style_table_cell)],
        [Paragraph("<b>Maintenance</b>", style_table_cell), Paragraph("<code>S301</code>", style_table_code), Paragraph("<code>maint123</code>", style_table_cell), Paragraph("Campus", style_table_cell), Paragraph("Campus infrastructure; lighting, pathways, classrooms, sports ground", style_table_cell)],
        [Paragraph("<b>Administrator</b>", style_table_cell), Paragraph("<code>ADM001</code>", style_table_code), Paragraph("<code>admin123</code>", style_table_cell), Paragraph("Global", style_table_cell), Paragraph("Assign staff from duty roster, provision staff accounts, view immutable audit logs & SLA compliance", style_table_cell)]
    ]
    t_cred = Table(cred_data, colWidths=[28 * mm, 24 * mm, 22 * mm, 24 * mm, 80 * mm])
    t_cred.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_cred)

    story.append(Spacer(1, 4 * mm))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 5: OPERATIONS & DAY-TO-DAY COMMANDS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("5. Operations, Logs & Maintenance Commands", style_h1))
    story.append(Paragraph("Useful commands for inspecting logs, executing container-level tests, and cleanly stopping the environment:", style_body))

    code_ops = [
        [Paragraph("<b># 1. Stream live logs from specific microservices:</b><br/>"
                   "docker compose logs -f complaints<br/>"
                   "docker compose logs -f accounts<br/>"
                   "docker compose logs -f client<br/><br/>"
                   "<b># 2. Run unit and integration tests inside active containers:</b><br/>"
                   "docker compose exec complaints npm test<br/>"
                   "docker compose exec accounts npm test<br/><br/>"
                   "<b># 3. Gracefully stop all containers:</b><br/>"
                   "docker compose down<br/><br/>"
                   "<b># 4. Stop containers AND wipe database volume (clean factory reset):</b><br/>"
                   "docker compose down -v<br/><br/>"
                   "<b># 5. Hot-rebuild a single microservice after editing code:</b><br/>"
                   "docker compose up -d --build complaints client", style_code)]
    ]
    t_ops = Table(code_ops, colWidths=[178 * mm])
    t_ops.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CODE_BG),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1e293b")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_ops)

    story.append(Spacer(1, 4 * mm))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 6: TROUBLESHOOTING & FAQ
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("6. Troubleshooting & Common Pitfalls", style_h1))

    faq_items = [
        ("Port 3306 or 8080 already in use:",
         "You likely have a local MySQL Server or standalone Node.js process running on your machine. Either stop the host process (e.g. <code>Stop-Service MySQL80</code> on Windows) or edit the host port mapping in <code>docker-compose.yml</code>."),
        ("Cannot connect to the Docker daemon:",
         "Docker Desktop is not currently running. Launch Docker Desktop from the Windows Start menu and wait for the status indicator to turn green before running commands."),
        ("Database connection timeout during startup:",
         "The microservice healthcheck retries automatically. If MySQL takes longer to initialize on your system, Docker Compose will retry up to 5 times (50 seconds) before attaching microservices.")
    ]
    for title, desc in faq_items:
        story.append(Paragraph(f"<b>&bull; {title}</b> {desc}", style_body))

    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=4, spaceAfter=8))
    story.append(Paragraph("<font color='#64748b' size='8'>Nivaaran Campus Grievance Redressal System • IIIT Vadodara • End of Guide</font>", ParagraphStyle('Foot', alignment=1)))

    # Build PDF with custom NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✔ Successfully generated {filename} ({os.path.getsize(filename):,} bytes)")

if __name__ == "__main__":
    build_pdf()
