"""
Exporter
--------
Generates Excel (.xlsx) and PDF files from query results.
  - Excel: formatted table with header row, auto column widths
  - PDF:   question + summary + data table using reportlab
No external chart rendering needed — tables only.
"""

import io
import os
import textwrap
from datetime import datetime
from typing import Any

import pandas as pd



def to_excel(
    question: str,
    summary: str,
    columns: list[str],
    rows: list[dict[str, Any]],
) -> bytes:
    """Return xlsx bytes."""
    df = pd.DataFrame(rows, columns=columns) if rows else pd.DataFrame(columns=columns)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Results", index=False, startrow=3)

        ws = writer.sheets["Results"]

        # Styling helpers
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        HEADER_FILL  = PatternFill("solid", fgColor="00D4AA")
        HEADER_FONT  = Font(bold=True, color="0A0A0F", size=11)
        META_FONT    = Font(italic=True, color="6B6B80", size=10)
        TITLE_FONT   = Font(bold=True, size=13, color="E8E8F0")
        THIN_BORDER  = Border(
            bottom=Side(style="thin", color="2A2A3A"),
        )
        ALIGN_LEFT   = Alignment(horizontal="left", vertical="center", wrap_text=True)
        ALIGN_CENTER = Alignment(horizontal="center", vertical="center")

        # Row 1 — question
        ws["A1"] = f"Q: {question}"
        ws["A1"].font = TITLE_FONT
        ws["A1"].alignment = ALIGN_LEFT
        ws.merge_cells(f"A1:{get_column_letter(max(len(columns), 1))}1")

        # Row 2 — summary
        ws["A2"] = summary
        ws["A2"].font = META_FONT
        ws["A2"].alignment = ALIGN_LEFT
        ws.merge_cells(f"A2:{get_column_letter(max(len(columns), 1))}2")

        # Row 3 — blank spacer (already used by startrow=3 offset)

        header_row = 4
        for col_idx, col_name in enumerate(columns, start=1):
            cell = ws.cell(row=header_row, column=col_idx)
            cell.fill      = HEADER_FILL
            cell.font      = HEADER_FONT
            cell.alignment = ALIGN_CENTER
            cell.border    = THIN_BORDER

        # Style data rows
        for row_idx in range(header_row + 1, header_row + 1 + len(rows)):
            for col_idx in range(1, len(columns) + 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.alignment = ALIGN_LEFT
                cell.border    = THIN_BORDER
                if (row_idx - header_row) % 2 == 0:
                    cell.fill = PatternFill("solid", fgColor="1A1A24")

        # Auto column widths
        for col_idx, col_name in enumerate(columns, start=1):
            col_letter = get_column_letter(col_idx)
            max_len    = max(
                len(str(col_name)),
                *[len(str(row.get(col_name, ""))) for row in rows[:50]],
                10,
            )
            ws.column_dimensions[col_letter].width = min(max_len + 4, 40)

        # Row heights
        ws.row_dimensions[1].height = 24
        ws.row_dimensions[2].height = 40

        meta_ws = writer.book.create_sheet("Info")
        meta_ws["A1"] = "Exported by"
        meta_ws["B1"] = "Insight Copilot"
        meta_ws["A2"] = "Question"
        meta_ws["B2"] = question
        meta_ws["A3"] = "Summary"
        meta_ws["B3"] = summary
        meta_ws["A4"] = "Row count"
        meta_ws["B4"] = len(rows)
        meta_ws["A5"] = "Exported at"
        meta_ws["B5"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for row in meta_ws.iter_rows():
            for cell in row:
                cell.alignment = Alignment(wrap_text=True, vertical="top")

    return output.getvalue()




def to_pdf(
    question: str,
    summary: str,
    sql: str,
    columns: list[str],
    rows: list[dict[str, Any]],
) -> bytes:
    """Return pdf bytes using reportlab."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer,
            Table, TableStyle, HRFlowable,
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        raise ImportError("reportlab is required for PDF export. Run: pip install reportlab")

    output = io.BytesIO()
    doc    = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2*cm,
    )

    ACCENT    = colors.HexColor("#00D4AA")
    DARK_BG   = colors.HexColor("#111118")
    SURFACE   = colors.HexColor("#1A1A24")
    MUTED     = colors.HexColor("#6B6B80")
    TEXT      = colors.HexColor("#E8E8F0")
    BORDER    = colors.HexColor("#2A2A3A")
    AMBER     = colors.HexColor("#F5A623")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Normal"],
        fontSize=16, textColor=TEXT, fontName="Helvetica-Bold",
        spaceAfter=6,
    )
    question_style = ParagraphStyle(
        "Question", parent=styles["Normal"],
        fontSize=12, textColor=ACCENT, fontName="Helvetica-Bold",
        spaceAfter=8, leading=16,
    )
    summary_style = ParagraphStyle(
        "Summary", parent=styles["Normal"],
        fontSize=10, textColor=TEXT, fontName="Helvetica",
        spaceAfter=6, leading=14,
    )
    meta_style = ParagraphStyle(
        "Meta", parent=styles["Normal"],
        fontSize=8, textColor=MUTED, fontName="Helvetica",
    )
    code_style = ParagraphStyle(
        "Code", parent=styles["Normal"],
        fontSize=8, textColor=ACCENT, fontName="Courier",
        backColor=DARK_BG, leftIndent=8, rightIndent=8,
        borderPadding=(4, 6, 4, 6), leading=12,
    )

    story = []

    # Header
    story.append(Paragraph("Insight Copilot", title_style))
    story.append(Paragraph(
        datetime.now().strftime("Exported %Y-%m-%d at %H:%M"),
        meta_style,
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", color=BORDER, thickness=0.5))
    story.append(Spacer(1, 0.3*cm))

    # Question
    story.append(Paragraph(f"Question: {question}", question_style))

    # Summary
    story.append(Paragraph(summary, summary_style))
    story.append(Spacer(1, 0.2*cm))

    # SQL
    sql_display = sql[:600] + "..." if len(sql) > 600 else sql
    story.append(Paragraph(f"SQL: {sql_display}", code_style))
    story.append(Spacer(1, 0.4*cm))

    # Data table
    MAX_ROWS_PDF = 100
    display_rows = rows[:MAX_ROWS_PDF]

    if columns and display_rows:
        # Build table data
        table_data = [columns]  
        for row in display_rows:
            table_data.append([
                _truncate(str(row.get(col, "")), 30)
                for col in columns
            ])

        col_count  = len(columns)
        page_width = A4[0] - 4*cm
        col_width  = page_width / col_count

        tbl = Table(
            table_data,
            colWidths=[col_width] * col_count,
            repeatRows=1,
        )
        tbl.setStyle(TableStyle([
            # Header
            ("BACKGROUND",  (0, 0), (-1, 0),  ACCENT),
            ("TEXTCOLOR",   (0, 0), (-1, 0),  DARK_BG),
            ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, 0),  9),
            ("ALIGN",       (0, 0), (-1, 0),  "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING",    (0, 0), (-1, 0), 6),
            # Data rows
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 1), (-1, -1), 8),
            ("TEXTCOLOR",   (0, 1), (-1, -1), TEXT),
            ("ALIGN",       (0, 1), (-1, -1), "LEFT"),
            ("TOPPADDING",  (0, 1), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
            # Zebra
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [DARK_BG, SURFACE]),
            # Grid
            ("LINEBELOW",   (0, 0), (-1, -1), 0.3, BORDER),
            ("LINEAFTER",   (0, 0), (-1, -1), 0.3, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl)

        if len(rows) > MAX_ROWS_PDF:
            story.append(Spacer(1, 0.2*cm))
            story.append(Paragraph(
                f"Showing first {MAX_ROWS_PDF} of {len(rows)} rows.",
                meta_style,
            ))
    else:
        story.append(Paragraph("No data to display.", meta_style))

    doc.build(story)
    return output.getvalue()


def _truncate(text: str, max_len: int) -> str:
    return text if len(text) <= max_len else text[:max_len - 1] + "…"