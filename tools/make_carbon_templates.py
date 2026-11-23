"""Blank product carbon footprint forms, one per standard, for the Carbon Footprint Form Check page.

    py tools/make_carbon_templates.py          ->  docs/public/tools/carbon-templates/<id>.xlsx

The column headers are the ones docs/components/carbon/cfqc.js recognises, and the "Study information"
sheet starts with the marker cfqc.js looks for (TEMPLATE_MARK), so a filled form is checked against the
standard it was made for. Keep the DQR rules and thresholds in step with carbon/standards.js.
"""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

OUT = Path(__file__).resolve().parent.parent / 'docs' / 'public' / 'tools' / 'carbon-templates'
MARK = 'scdd.pro carbon footprint form'
ROWS = 60

# id, title, source URL, rating parts, DQR divisor, rules shown on the Instructions sheet, extra study rows
STD = {
    'battery': ('EU Battery Regulation – carbon footprint (draft method) 欧盟电池法规碳足迹（方法草案）',
                'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=PI_COM:Ares(2024)3131389',
                ['TeR', 'GeR', 'TiR'], 3,
                ['DQR = (TeR + GeR + TiR) / 3, each rated 1 (best) to 5.',
                 'A secondary dataset used for a most relevant process needs TeR ≤ 4.',
                 'Use EF-compliant datasets (EF 3.1) where they exist.',
                 'Electricity: national average consumption mix; no guarantees of origin, PPAs or other contractual instruments.',
                 'Cut-off: at most 1% of the mass of each component.',
                 'Offsets and carbon credits may not be included.',
                 'The calculation method is the Commission draft delegated act of April 2024, not yet adopted.'],
                [('Functional unit 功能单位', 'kg CO2e per kWh of total energy provided over the service life'),
                 ('Service life (full equivalent cycles) 使用寿命（等效满充次数）', '')]),
    'pef': ('PEF – Recommendation (EU) 2021/2279 产品环境足迹',
            'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32021H2279',
            ['TeR', 'GeR', 'TiR', 'P'], 4,
            ['DQR = (TeR + GeR + TiR + P) / 4, each rated 1 (best) to 5.',
             'Company-specific datasets: DQR ≤ 1.5, with TeR, GeR and TiR ≤ 2 and P ≤ 3.',
             'Secondary datasets of most relevant processes: DQR ≤ 3.0.',
             'Use EF-compliant datasets where they exist.',
             'Cut-off: at most 3%.'],
            []),
    'iso14067': ('ISO 14067:2018',
                 'https://www.iso.org/standard/71206.html',
                 ['TeR', 'GeR', 'TiR', 'P'], 4,
                 ['ISO 14067 does not prescribe a rating scale. The form keeps the common four-criteria DQR; replace it with your own data quality method if you use one, and describe it under "Data quality method".',
                  'Document cut-off criteria, allocation, GWP source, biogenic carbon, land-use change and the time period (study information sheet).',
                  'ISO 14067 is a paid standard: confirm the requirements against your copy.'],
                 [('Data quality method 数据质量评价方法', '')]),
    'ghg': ('GHG Protocol Product Standard (2011) 温室气体核算体系产品标准',
            'https://ghgprotocol.org/sites/default/files/standards/Product-Life-Cycle-Accounting-Reporting-Standard_041613.pdf',
            ['TeR', 'GeR', 'TiR', 'P'], 4,
            ['The data quality scale of the Product Standard is guidance: rate each dataset 1 (best) to 5 and explain the basis.',
             'Report the GWP source, biogenic and land-use change emissions, allocation, time period, assurance and uncertainty.',
             'Offsets may not be included in the inventory result.'],
            []),
    'pact': ('WBCSD PACT Methodology v3.0',
             'https://www.carbon-transparency.org/resources/pact-methodology-v3-methodology-for-calculating-and-exchanging-cradle-to-gate-product-carbon-footprints-pcfs',
             ['TeR', 'GeR', 'TiR'], 3,
             ['Rate TeR, GeR and TiR 1 (best) to 5 (mandatory from 2028).',
              'TeR 1–2 is only for primary data; the best TeR for a database dataset is 3.',
              'Electricity: supplier-specific (with valid contractual instruments) → residual mix → grid mix.',
              'GWP: IPCC AR6. Cut-off: at most 3%. Report the primary data share (PDS).'],
             []),
    'catenax': ('Catena-X PCF Rulebook v4',
                'https://catena-x.net/wp-content/uploads/2025/10/Catena-X-Product-Carbon-Footprint-Rulebook_v4-with-line-numbers.pdf',
                ['TeR', 'GeR', 'TiR'], 3,
                ['Data quality ratings use the PACT v3 matrix: TeR, GeR, TiR, 1 (best) to 5.',
                 'TeR 1–2 is only for primary data; the best TeR for a database dataset is 3.',
                 'GWP: IPCC AR6. Cut-off: at most 3%. Report the primary data share (PDS).'],
                []),
    'tfs': ('TfS PCF Guideline v3.0 (chemicals) 化工行业',
            'https://tfs-initiative.com/app/uploads/2024/12/TfS-PCF-Guidelines-2024.pdf',
            ['TeR', 'GeR', 'TiR'], 3,
            ['Data quality ratings use the PACT v3 matrix: TeR, GeR, TiR, 1 (best) to 5.',
             'TeR 1–2 is only for primary data; the best TeR for a database dataset is 3.',
             'GWP: IPCC AR6. Cut-off: at most 3%. Report the primary data share (PDS).'],
            []),
}

STUDY = [
    ('Product name 产品名称', ''),
    ('Declared / functional unit 声明单位 / 功能单位', ''),
    ('Company and site 公司及工厂', ''),
    ('Reporting period (data collection period) 数据收集周期', ''),
    ('Reference year 基准年', ''),
    ('System boundary 系统边界', 'cradle-to-gate'),
    ('GWP set / characterisation method GWP 来源 / 特征化方法', ''),
    ('Database(s) and version 数据库及版本', ''),
    ('Cut-off rule, percent of mass or emissions excluded 截断规则（排除部分所占百分比）', ''),
    ('Allocation method 分配方法', ''),
    ('Biogenic carbon 生物源碳', ''),
    ('Land-use change (dLUC) 土地利用变化', ''),
    ('Electricity modelling 电力建模方式', ''),
    ('Primary data share (PDS, %) 一手数据占比（%）', ''),
    ('Uncertainty 不确定性', ''),
    ('External review / assurance 外部审查 / 鉴证', ''),
    ('Prepared by and date 填写人及日期', ''),
]

HEAD = ['No. 序号', 'Life-cycle stage 生命周期阶段', 'Material name 材料名称（物料 / 能源 / 运输 / 废弃物）',
        'Quantity per declared unit 用量', 'Unit 单位', 'Measured or estimated 实测或估算',
        'Data source 数据来源 (supplier / database / literature)', 'Dataset name 数据集名称',
        'Dataset geography 数据集地理', 'Dataset UUID',
        'Emission factor 排放因子 (kg CO2e/unit)', 'Emissions due to this input 排放量 (kg CO2e)']
RATING_HEAD = {'TeR': 'TeR 技术代表性', 'GeR': 'GeR 地理代表性', 'TiR': 'TiR 时间代表性', 'P': 'P (precision) 精确度'}
STAGES = ['Raw material 原材料', 'Energy 能源', 'Transport 运输', 'Production 生产', 'Packaging 包装', 'Waste 废弃物', 'Other 其他']

BOLD = Font(bold=True)
HFILL = PatternFill('solid', fgColor='DDEBF7')
IFILL = PatternFill('solid', fgColor='FFF2CC')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical='top')


def build(sid):
    title, url, parts, div, rules, extra = STD[sid]
    wb = Workbook()

    st = wb.active
    st.title = 'Study information'
    st['A1'] = f'{MARK} — {title}'
    st['A1'].font = Font(bold=True, size=12)
    st.append(['Standard id', sid])
    st.append(['Standard 标准', title])
    for label, val in STUDY + extra:
        st.append([label, val])
    for r in range(4, st.max_row + 1):
        st.cell(r, 1).font = BOLD
        st.cell(r, 2).fill = IFILL
        for c in (1, 2):
            st.cell(r, c).border = BOX
            st.cell(r, c).alignment = WRAP
    st.column_dimensions['A'].width = 52
    st.column_dimensions['B'].width = 70
    st.row_dimensions[1].height = 22

    inv = wb.create_sheet('Inventory')
    inv['A1'] = 'Inventory 清单 — one row per material, energy, transport leg or waste stream 每行一项'
    inv['A1'].font = Font(bold=True, size=12)
    head = HEAD + [RATING_HEAD[p] for p in parts] + ['DQR 数据质量评分']
    hr = 3
    for c, h in enumerate(head, 1):
        cell = inv.cell(hr, c, h)
        cell.font = BOLD
        cell.fill = HFILL
        cell.border = BOX
        cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
    col = {h: i + 1 for i, h in enumerate(head)}
    L = lambda h: get_column_letter(col[h])
    q, ef, em = L(HEAD[3]), L(HEAD[10]), L(HEAD[11])
    rcols = [L(RATING_HEAD[p]) for p in parts]
    dq = get_column_letter(len(head))
    for r in range(hr + 1, hr + 1 + ROWS):
        inv.cell(r, 1, r - hr)
        inv[f'{em}{r}'] = f'=IF(AND(ISNUMBER({q}{r}),ISNUMBER({ef}{r})),{q}{r}*{ef}{r},"")'
        inv[f'{dq}{r}'] = f'=IF(COUNT({",".join(c + str(r) for c in rcols)})={len(parts)},ROUND(({"+".join(c + str(r) for c in rcols)})/{div},2),"")'
        for c in range(1, len(head) + 1):
            inv.cell(r, c).border = BOX
            if c not in (col[HEAD[11]], len(head), 1):
                inv.cell(r, c).fill = IFILL
    tot = hr + ROWS + 1
    inv.cell(tot, col[HEAD[10]], 'Total 合计').font = BOLD
    inv[f'{em}{tot}'] = f'=SUM({em}{hr + 1}:{em}{hr + ROWS})'
    inv[f'{em}{tot}'].font = BOLD
    widths = [6, 18, 34, 12, 9, 16, 26, 36, 14, 22, 16, 16] + [12] * (len(parts) + 1)
    for i, w in enumerate(widths, 1):
        inv.column_dimensions[get_column_letter(i)].width = w
    inv.row_dimensions[hr].height = 60
    inv.freeze_panes = inv.cell(hr + 1, 4)
    dv = DataValidation(type='whole', operator='between', formula1='1', formula2='5', allow_blank=True,
                        error='Rate 1 (best) to 5 (worst) 请填 1（最好）至 5（最差）', showErrorMessage=True)
    inv.add_data_validation(dv)
    for c in rcols:
        dv.add(f'{c}{hr + 1}:{c}{hr + ROWS}')
    sv = DataValidation(type='list', formula1='"' + ','.join(STAGES) + '"', allow_blank=True)
    inv.add_data_validation(sv)
    sv.add(f'B{hr + 1}:B{hr + ROWS}')
    mv = DataValidation(type='list', formula1='"Measured 实测,Calculated 计算,Estimated 估算,Database 数据库"', allow_blank=True)
    inv.add_data_validation(mv)
    mv.add(f'F{hr + 1}:F{hr + ROWS}')

    ins = wb.create_sheet('Instructions')
    lines = [
        (f'How to fill this form 填写说明 — {title}', True),
        ('', False),
        ('1. Study information: answer every yellow cell. Leave a cell blank only if it does not apply; the checker reads blank answers as "not documented".', False),
        ('   研究信息：填写所有黄色单元格。不适用的可留空，检查工具会把空白视为"未记录"。', False),
        ('2. Inventory: one row per input or output. Quantity × emission factor fills the emissions column; the DQR fills in once every rating is entered.', False),
        ('   清单：每行一项。用量 × 排放因子自动计算排放量；所有评分填完后 DQR 自动计算。', False),
        ('3. Dataset name: copy the exact name from the database (e.g. "market for aluminium, primary, ingot | GLO"), and its geography and UUID if you have them.', False),
        ('   数据集名称：照抄数据库中的完整名称，并填写地理代码和 UUID（如有）。', False),
        ('4. Do not rename or move the header row: the checker finds the columns by their names. You may add columns to the right.', False),
        ('   请勿修改或移动表头行（检查工具按列名识别）；可在右侧增加列。', False),
        ('5. Check the filled form at https://scdd.pro/en/carbon-qc.html — the file is read in your browser and not uploaded.', False),
        ('   填好后可在 https://scdd.pro/zh/tools/carbon-qc.html 检查，文件只在浏览器中读取，不会上传。', False),
        ('', False),
        ('Rules of this standard 本标准要求', True),
    ] + [(f'• {r}', False) for r in rules] + [
        ('', False),
        (f'Source 来源: {url}', False),
        ('This form is a convenience template, not an official form of the standard owner. 本表为便利模板，并非标准发布方的官方表格。', False),
    ]
    for i, (t, b) in enumerate(lines, 1):
        c = ins.cell(i, 1, t)
        c.alignment = Alignment(wrap_text=True, vertical='top')
        if b:
            c.font = Font(bold=True, size=12 if i == 1 else 11)
    ins.column_dimensions['A'].width = 120

    wb.move_sheet('Instructions', offset=-2)
    wb.active = 1
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'pcf-form-{sid}.xlsx'
    wb.save(path)
    return path


if __name__ == '__main__':
    for sid in STD:
        print(build(sid))
