# Gera o PDF editável de auditoria do Kanto Showdown (formulário AcroForm)
# Requer: pip install reportlab pillow  (rodar com `npm run auditoria`)
import json, os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
                                Flowable, PageBreak, KeepTogether, Image, CondPageBreak)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from notes import NOTES

D = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'data.json')))
GAME = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1]

F = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('DV', F + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVB', F + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DVI', F + 'DejaVuSans-Oblique.ttf'))
pdfmetrics.registerFontFamily('DV', normal='DV', bold='DVB', italic='DVI', boldItalic='DVB')

INK = colors.HexColor('#2b1d2b')
MUTED = colors.HexColor('#6b6f80')
LINE = colors.HexColor('#d5d8e2')
ST = {
    'body': ParagraphStyle('body', fontName='DV', fontSize=8.6, leading=11.2, textColor=INK),
    'small': ParagraphStyle('small', fontName='DV', fontSize=7.4, leading=9.4, textColor=MUTED),
    'h1': ParagraphStyle('h1', fontName='DVB', fontSize=17, leading=21, textColor=colors.white, backColor=colors.HexColor('#ff4d6d'), borderPadding=(5, 6, 5, 6), spaceBefore=4, spaceAfter=10),
    'h2': ParagraphStyle('h2', fontName='DVB', fontSize=12, leading=15, textColor=colors.HexColor('#2a6fc0'), spaceBefore=8, spaceAfter=4),
    'h3': ParagraphStyle('h3', fontName='DVB', fontSize=9.6, leading=12, textColor=INK, spaceBefore=4, spaceAfter=2),
    'title': ParagraphStyle('title', fontName='DVB', fontSize=34, leading=40, alignment=TA_CENTER, textColor=colors.HexColor('#2a4aa8')),
    'center': ParagraphStyle('center', fontName='DV', fontSize=10, leading=14, alignment=TA_CENTER, textColor=MUTED),
    'cell': ParagraphStyle('cell', fontName='DV', fontSize=7.4, leading=9.2, textColor=INK),
    'cellb': ParagraphStyle('cellb', fontName='DVB', fontSize=7.4, leading=9.2, textColor=INK),
    'mono': ParagraphStyle('mono', fontName='DV', fontSize=8.4, leading=11, textColor=INK, backColor=colors.HexColor('#f0f1f6'), borderPadding=5, spaceBefore=3, spaceAfter=6),
}
P = lambda t, s='body': Paragraph(t, ST[s])
esc = lambda t: (t or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

TYPE = {t['id']: t for t in D['types']}
def chip(t):
    return f'<font backColor="{TYPE[t]["color"]}" color="#ffffff">&nbsp;{TYPE[t]["name"]}&nbsp;</font>'

def fmt(n):
    a = abs(n)
    if a >= 1e15: return f'{n:.2e}'
    for d, u in ((1e12, 'T'), (1e9, 'B'), (1e6, 'M'), (1e4, 'K')):
        if a >= d: return f'{n / d:.1f}'.rstrip('0').rstrip('.') + u
    return f'{n:g}' if isinstance(n, float) and n != int(n) else str(int(round(n)))

# ---------- campos editáveis ----------
FIELD_ID = [0]
class NoteField(Flowable):
    """Campo de texto multilinha + caixas Aprovado / Revisar (AcroForm)."""
    def __init__(self, key, label='Notas da auditoria', height=34, boxes=True):
        super().__init__()
        self.key, self.label, self.h, self.boxes = key, label, height, boxes
    def wrap(self, aw, ah):
        self.w = aw
        return aw, self.h + 12
    def draw(self):
        c = self.canv
        FIELD_ID[0] += 1
        c.setFont('DVB', 7.2); c.setFillColor(MUTED)
        c.drawString(0, self.h + 3, self.label)
        bx = self.w
        if self.boxes:
            for lab, nm in (('Revisar', 'revisar'), ('Aprovado', 'ok')):
                tw = pdfmetrics.stringWidth(lab, 'DV', 7.2)
                bx -= tw + 16
                x, y = c.absolutePosition(bx, self.h + 1)
                c.acroForm.checkbox(name=f'{self.key}_{nm}', x=x, y=y, size=9, buttonStyle='check', borderColor=colors.HexColor('#8e9aa6'), fillColor=colors.white, textColor=INK, forceBorder=True, relative=False)
                c.setFont('DV', 7.2); c.setFillColor(INK)
                c.drawString(bx + 12, self.h + 3, lab)
        x, y = c.absolutePosition(0, 0)
        c.acroForm.textfield(name=f'{self.key}_notas', tooltip=f'{self.label} ({self.key})', x=x, y=y, width=self.w, height=self.h,
                             fontName='Helvetica', fontSize=8, borderColor=colors.HexColor('#b9bfcf'), fillColor=colors.HexColor('#fffdf3'),
                             textColor=INK, borderWidth=0.6, fieldFlags='multiline', relative=False)

# ---------- sprites ----------
CACHE = os.path.join(GAME, 'node_modules', '.cache', 'auditoria-spr'); os.makedirs(CACHE, exist_ok=True)
def sprite(id_, shiny=False, h=40):
    ext = 'gif' if next(s for s in D['species'] if s['id'] == id_)['anim'] else 'png'
    src = f'{GAME}/public/sprites/pokemon/{"shiny/" if shiny else ""}{id_}.{ext}'
    dst = os.path.join(CACHE, f'{id_}{"s" if shiny else ""}.png')
    if not os.path.exists(dst):
        try:
            im = PILImage.open(src); im.seek(0); im = im.convert('RGBA')
            bb = im.getbbox()
            if bb: im = im.crop(bb)
            im = im.resize((im.width * 3, im.height * 3), PILImage.NEAREST)
            im.save(dst)
        except Exception:
            return Spacer(h, h)
    w0, h0 = PILImage.open(dst).size
    s = min(h / h0, (h * 1.25) / w0)
    return Image(dst, width=w0 * s, height=h0 * s)

# ---------- documento ----------
def on_page(c, doc):
    c.saveState()
    c.setFont('DV', 7); c.setFillColor(MUTED)
    c.drawString(14 * mm, 8 * mm, 'Kanto Showdown — Auditoria (OS v2) · campos amarelos são editáveis')
    c.drawRightString(A4[0] - 14 * mm, 8 * mm, f'{doc.page}')
    c.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=13 * mm, bottomMargin=14 * mm,
                      title='Kanto Showdown — Auditoria de tipos, stats e Pokémon', author='Kanto Showdown', subject='Auditoria OS v2')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate('p', frames=[frame], onPage=on_page)])
W = doc.width
S = []

R = D['RATE']; T = D['TYPE_TUNE']
species = D['species']
n_ab = sum(1 for s in species if not s['ability']['none'])
n_sh = sum(1 for s in species if s['shiny'])

# capa
S += [Spacer(1, 50), P('KANTO SHOWDOWN', 'title'), Spacer(1, 6),
      P('<b>Documento de auditoria</b> — tipos, stats, habilidades e todos os Pokémon', 'center'),
      P(f'{len(species)} espécies · {n_ab} com habilidade · {n_sh} versões shiny ★ próprias · gerado do código do jogo (versão atual do GitHub)', 'center'),
      Spacer(1, 26)]
S.append(P('<b>Como usar</b>', 'h2'))
S.append(P('Este PDF é um <b>formulário editável</b>. Abaixo de cada stat, tipo e Pokémon há um campo amarelo "Notas da auditoria" e as caixas <b>Aprovado</b> / <b>Revisar</b>. '
           'Preencha no Adobe Acrobat Reader, no leitor do Chrome/Edge/Firefox, no Okular ou no Xodo (celular) e salve: as anotações ficam gravadas no próprio arquivo. '
           'Se você me mandar o PDF preenchido de volta, eu consigo ler os campos e aplicar as mudanças.'))
S.append(Spacer(1, 6))
S.append(P('<b>Sobre os números</b>: tudo aqui foi extraído do código no momento da geração. Os stats estão no nível indicado, sem itens, treinador nem bônus permanentes. '
           'Os textos de habilidade mostram os números do Lv1 (e do Lv3 quando mudam); todo número de habilidade é multiplicado pelo nível (×1, ×2, ×4, ×8, ×16).'))
S.append(Spacer(1, 6))
S.append(P('<b>Sobre o Batomon</b>: as regras pedidas na OS (Queimadura a cada 0,5s, Veneno a cada 1s, Choque por golpe, Multicast, Escudo, níveis ×2, fusão 3→2→2) seguem o Batomon Showdown, e as habilidades usam o mesmo <i>formato</i> (gatilho + efeito, posições atrás/frente/adjacente). '
           'Os textos das habilidades foram escritos para este jogo. <b>Não consegui comparar texto a texto com o Batomon</b>: no batodex.com as habilidades carregam por JavaScript e não aparecem para a minha ferramenta. '
           'Por isso o campo "Origem" de cada Pokémon diz de onde a habilidade veio <i>dentro deste projeto</i> (mantida a pedido, renomeada, criada na OS v2, ajustada na calibração) e não garante que não exista algo parecido no Batomon. '
           'Se você reconhecer uma cópia direta, marque "Revisar".'))
S.append(PageBreak())

# ---------- 1. regras gerais ----------
S.append(P('1. Regras gerais', 'h1'))
S.append(P('Orçamento (de onde vêm os stats)', 'h2'))
S.append(P('Cada espécie tem um <b>orçamento</b> de pontos: <b>base da raridade × fator do estágio × BST ÷ BST médio da raridade</b>.'))
S.append(Table([[P('<b>Raridade</b>', 'cell')] + [P(x, 'cell') for x in ['Comum', 'Incomum', 'Raro', 'Super Raro', 'Lendário', 'Mítico']],
                [P('<b>Base</b>', 'cell')] + [P(str(x), 'cell') for x in [100, 130, 170, 220, 300, 360]],
                [P('<b>Estágio</b>', 'cell'), P('bebê ×0,8', 'cell'), P('1º ×1,0', 'cell'), P('2º ×1,35', 'cell'), P('3º ×1,7', 'cell'), P('Gen 4+ ×2,0', 'cell'), P('', 'cell')]],
               colWidths=[W / 7] * 7, style=TableStyle([('GRID', (0, 0), (-1, -1), 0.4, LINE), ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f1f6'))])))
S.append(Spacer(1, 4))
S.append(P(f'O orçamento é dividido entre os tipos nativos: 1 tipo = 100%; 2 tipos = 65% / 35%; 3 tipos = 50% / 30% / 20%. '
           f'Um <b>tipo ganho</b> (TM de Tipo, Criador Pokémon, Chef de Celadon, Infusão de Tipo, Conversão, Adaptável) soma +35% do orçamento no stat daquele tipo, sem tirar dos outros; máximo de 3 tipos. '
           f'O <b>HP</b> vem do orçamento inteiro ({R["hp"]} HP por ponto) e vai para o HP compartilhado do time. A <b>recarga</b> vem da Velocidade (1,4s a 4,6s; Dragão ×1,6). '
           f'Stats "por golpe" são proporcionais à recarga (quem ataca devagar bate mais forte por golpe). '
           f'Por fim, cada tipo tem um <b>ajuste fino</b> (multiplicador do orçamento gasto no tipo) calibrado com 52 mil runs do bot.'))
S.append(P('Níveis e fusão', 'h2'))
S.append(P('3 cópias Lv1 → Lv2; 2 Lv2 → Lv3; 2 Lv3 → Lv4 (Magikarp precisa de 5 cópias). Nível máximo 4; só o Poliwrath chega ao Lv5. '
           'Multiplicador de nível: Lv1 ×1 · Lv2 ×2 · Lv3 ×4 · Lv4 ×8 · Lv5 ×16 — vale para todos os stats e para todos os números das habilidades.'))
S.append(P('Ordem de cálculo', 'h2'))
S.append(P('(base + aditivos permanentes + aditivos da batalha) × (1 + Σ%) × Π multiplicadores × nível', 'mono'))
S.append(P('Os % de Dano somam entre si (Dragão: multiplicam entre si). São multiplicadores: itens Raros+ de "×X", Presa de Dragão ×1,3, Escama de Dragão ×1,6, Joia Misteriosa ×1,2, Placas ×1,25 (no stat do tipo) e o Crítico. '
           'Os multiplicadores de item também valem para Cura, Escudo e status (decisão da calibração, ver relatório).'))
S.append(P('Batalha, fadiga e fim', 'h2'))
S.append(P('Cada Pokémon ataca quando a barra de recarga enche; o dano vai para o <b>HP compartilhado</b> do time inimigo. Após <b>30s</b> todo dano cresce +8% por segundo. '
           'Após <b>45s</b> cada time perde 2% do HP máximo por segundo (+1% a cada 5s), ignorando Escudo e Armadura. Aos <b>75s</b> vence quem tiver mais HP%. '
           'Nocautes só acontecem por habilidade (o Pokémon para de agir; HP é do time).'))
S.append(P('Shiny', 'h2'))
S.append(P(f'Todo shiny tem +20% no orçamento e +20% nos números da habilidade. {n_sh} espécies têm uma <b>versão ★ própria</b> (habilidade aprimorada ou nova); todas as das gerações 4+ têm.'))
S.append(NoteField('regras_gerais', height=44))
S.append(PageBreak())

# ---------- 2. stats ----------
S.append(P('2. Como funciona cada stat', 'h1'))
S.append(P('Para cada stat: o que faz na batalha, de que tipo vem, quanto 1 ponto de orçamento compra e o que interage com ele. "Por golpe" = aplicado a cada golpe de cada ativação (Multicast repete).', 'small'))
STATS = [
 ('dmg', 'Dano', 'Normal (70%), Lutador (60%), Terra, Dragão, Sombrio (50%)', f'{R["dmg"]} por ponto (recarga de 3s)',
  'Golpe direto no HP do time inimigo, a cada golpe. Passa primeiro pela <b>Armadura</b> (reduz cada golpe, mínimo 1) e depois pelo <b>Escudo</b> (absorve). Multiplicado por % de Dano, Crítico, Punir, Crescimento e fadiga. '
  'Cada golpe direto também detona o <b>Choque</b> acumulado no inimigo. Quem não tem nenhum stat de efeito (só Crescimento, Eco, Carga ou Bênção) recebe Dano com 40% do orçamento do 1º tipo, para não ficar inútil.'),
 ('hp', 'HP', 'Todos (orçamento inteiro); Normal ganha extra (30% do orçamento a 12/pt)', f'{R["hp"]} por ponto; Normal {R["hpNormal"]}',
  'Soma no HP compartilhado do time (150 base + HP de cada Pokémon da Equipe + bônus). Não protege um Pokémon específico: o time inteiro perde junto.'),
 ('cd', 'Recarga e velocidade', 'Velocidade da espécie', '1,4s a 4,6s; Dragão ×1,6',
  'Tempo entre ataques. "+X% vel. de recarga" divide o tempo por (1 + X). Sem teto: o piso é 0,2s e cada +100% acima do piso vira +1 Multicast. O <b>Frio</b> no seu time desacelera a barra.'),
 ('casts', 'Multicast', 'Inseto (base 2), habilidades e itens', '—',
  'Golpes por ativação. Cada golpe tem dano cheio e aplica status, cura e escudo de novo. Efeitos "ao atacar" disparam só 1 vez por ativação.'),
 ('burn', 'Queimadura', 'Fogo', f'{R["burn"]} por ponto, por golpe',
  'Acúmulos no time inimigo. A cada 0,5s causa dano igual aos acúmulos e perde 1. Aplicar N acúmulos rende ≈ N²/2 de dano no total (cresce rápido com acúmulos altos). Perde 15% contra Escudo; ignora Armadura. Limpeza remove.'),
 ('poison', 'Veneno', 'Veneno', f'{R["poison"]} por ponto, por golpe',
  'Acúmulos no inimigo. A cada 1s causa dano igual aos acúmulos e <b>nunca diminui</b>: é fraco no começo e forte em lutas longas. Não ignora mais o Escudo (perde 15% contra ele). Limpeza remove.'),
 ('shock', 'Choque', 'Elétrico', f'{R["shock"]} por ponto, por golpe',
  'Acúmulos no inimigo que <b>não diminuem</b>. Cada golpe direto que o inimigo recebe (de qualquer Pokémon seu) causa dano extra igual aos acúmulos. Multicast e Inseto detonam muito. Armadura reduz esse golpe extra; Escudo corta 15%.'),
 ('cold', 'Frio', 'Gelo', f'{R["cold"]} por ponto, por golpe',
  'Acúmulos no inimigo. A barra de recarga inimiga anda ×1/(1 + 0,02 × Frio): 50 de Frio = metade da velocidade. Perde 1 por segundo (Glaceon trava). Não causa dano.'),
 ('heal', 'Cura', 'Água (80%)', f'{R["heal"]} por ponto, por golpe',
  'Recupera HP do time (até o máximo). Multiplicada por Blissey e Sino de Concha. Gyarados e Kingler transformam Cura em Dano.'),
 ('cleanse', 'Limpeza', 'Água', f'{R["cleanse"]}% por ponto (fixo, ×nível)',
  'A cada ativação remove N% (arredondado para cima) de Queimadura, Veneno, Choque e Frio do <b>próprio</b> time. Contra de times de status.'),
 ('shield', 'Escudo', 'Pedra, Aço (30%)', f'{R["shield"]} por ponto, por golpe',
  'Barreira do time, sem teto, que absorve golpes antes do HP. Status perde 15% ao bater no Escudo. Terra (Perfurar) gasta Escudo 2x mais rápido; Dano Espectral ignora. Sandslash/Rhyperior ganham Dano com ele.'),
 ('armor', 'Armadura', 'Aço (70%)', f'{R["armor"]} por ponto (fixo)',
  'Soma no time e reduz <b>cada</b> golpe direto e cada golpe de Choque (mínimo 1). Ótima contra Multicast e golpes pequenos. Não afeta Queimadura e Veneno. Perfurar e Espectral ignoram.'),
 ('growth', 'Crescimento', 'Planta', f'{R["growth"]}% por ponto (fixo, ×nível)',
  'A cada ataque, o próprio Pokémon ganha +N% em todos os stats nesta batalha (aditivo). Multiplica Dano, status, Cura e Escudo deste Pokémon.'),
 ('crit', 'Crítico', 'Lutador (40%)', f'{R["crit"]}% por ponto (fixo, ×nível)',
  'Chance de crítico (2x). Cada 1% acima de 100% soma +0,01x ao multiplicador. Sirfetch\'d sobe o crítico para 3x. Só afeta Dano e Espectral.'),
 ('pierce', 'Perfurar', 'Terra (2x); Areia Macia, Rhydon, Dugtrio e Giovanni: 3x', '—',
  'O golpe ignora a Armadura e consome Escudo N vezes mais rápido.'),
 ('charge', 'Carga', 'Voador', f'{R["charge"]} por ponto (fixo)',
  'Ao atacar, adianta a recarga do aliado atrás em Carga × 0,1s e a própria em metade disso.'),
 ('swarm', 'Enxame', 'Inseto', f'{R["swarm"]} por ponto',
  'No início da batalha soma Enxame × (número de Insetos no time) ao Dano. Somado ao Multicast 2 de todo Inseto.'),
 ('echo', 'Eco', 'Psíquico', f'{R["echo"]}% por ponto (fixo, ×nível)',
  'Ao atacar, chance de ativar um aliado aleatório (que ataca de novo). Cada 100% garante 1 ativação; o resto é chance. Profundidade máxima 3.'),
 ('spectral', 'Dano Espectral', 'Fantasma', f'{R["spectral"]} por ponto',
  'Dano que ignora Escudo e Armadura. Bônus por nocautes: Etiqueta Maldita (+5% por nocaute), Annihilape, Gastly.'),
 ('punish', 'Punir', 'Sombrio (50%)', f'{R["punish"]}% por ponto (fixo, ×nível)',
  'Multiplica o golpe por 1 + Punir% × (acúmulos de status no inimigo ÷ 10). Inútil sem status no inimigo; forte com Fogo/Veneno/Choque/Frio no time.'),
 ('blessing', 'Bênção', 'Fada', f'{R["blessing"]} por ponto',
  'No início da batalha, os aliados adjacentes ganham +N <b>permanentemente</b> em todos os stats que já têm (Dano, Cura, Escudo, Armadura e status). Acumula a cada batalha. '
  'Como é o mesmo N para tudo, vale muito mais em stats de escala pequena (Queimadura, Choque) do que em Dano/Cura: ponto de atenção na auditoria.'),
 ('protect', 'Proteger', 'Mr. Mime, Chansey ★, Blissey ★, Happiny ★', '—', 'Anula o próximo nocaute que o Pokémon receberia (inclusive o Pacto Sombrio do Haunter, que não ganha bônus).'),
 ('disable', 'Desativar', 'Arbok, Jynx', '—', 'O Pokémon desativado não ativa habilidades pelo tempo indicado (o ataque básico continua).'),
]
for key, name, src, rate, txt in STATS:
    S.append(KeepTogether([P(name, 'h3'), P(f'<b>Vem de:</b> {src} · <b>Taxa:</b> {rate}', 'small'), P(txt), NoteField(f'stat_{key}', height=26)]))
    S.append(Spacer(1, 4))
S.append(PageBreak())

# ---------- 3. tipos ----------
S.append(P('3. Tipos', 'h1'))
S.append(P('Sem sinergia: cada tipo dá uma mecânica própria. Tipos duplos e triplos somam as mecânicas.'))
cnt = {t['id']: sum(1 for s in species if t['id'] in s['types']) for t in D['types']}
rows = [[P('<b>Tipo</b>', 'cell'), P('<b>Mecânica</b>', 'cell'), P('<b>Ajuste fino</b>', 'cell'), P('<b>Espécies</b>', 'cell')]]
for t in D['types']:
    rows.append([P(chip(t['id']), 'cell'), P(esc(t['effect']), 'cell'), P(f'×{T[t["id"]]}', 'cell'), P(str(cnt[t['id']]), 'cell')])
S.append(Table(rows, colWidths=[22 * mm, W - 62 * mm, 20 * mm, 20 * mm], repeatRows=1,
               style=TableStyle([('GRID', (0, 0), (-1, -1), 0.4, LINE), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f1f6')), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')])))
S.append(Spacer(1, 6))
S.append(P('O ajuste fino multiplica o orçamento gasto no stat do tipo. Valores altos (×3) e baixos (×0,2) indicam onde a calibração por números saturou: a força desses arquétipos vem mais da disponibilidade de espécies no sorteio da run e das habilidades do que do stat.', 'small'))
for t in D['types']:
    S.append(KeepTogether([P(f'{chip(t["id"])}', 'h3'), NoteField(f'tipo_{t["id"]}', height=22)]))
S.append(PageBreak())

# ---------- 4. Pokédex ----------
S.append(P(f'4. Pokémon ({len(species)})', 'h1'))
S.append(P('Ordem por linha evolutiva. Para cada espécie: tipos, raridade, orçamento, regra de evolução, stats do Lv1 ao Lv4, habilidade (normal e ★), a ideia de design, combos sugeridos, origem e pontos de atenção.'))

KEPT = {3, 15, 31, 28, 139, 45, 89, 26, 148, 149, 186, 121, 105, 71}
RENAMED = {64: 'Colher Torta', 82: 'Ímã', 35: 'Metrônomo', 136: 'Fogo Interno'}
NEWSP = {439, 440, 446, 462, 463, 464, 465, 466, 467, 470, 471, 474, 700, 863, 865, 866, 900, 979}
BRIDGE = {128, 143, 117, 130, 212, 150, 122, 119, 97, 141}
NERF = {18, 169, 42, 91, 85, 84}
ITEMUSED = {36, 53, 463, 137}
DISABLE = {24, 124}
def origin(s):
    i = s['id']
    if s['ability']['none']:
        return 'Sem habilidade por regra da OS v2 (primeiros estágios e bebês só têm stats).' + (' Ganhou uma versão ★ própria.' if s['shiny'] else '')
    o = []
    if i in KEPT: o.append('Mantida a pedido da OS v2 (já existia na v2), com números adaptados.')
    elif i in RENAMED: o.append(f'Renomeada pela OS v2 (antes: "{RENAMED[i]}").')
    elif i in NEWSP: o.append('Criada na OS v2 (espécie nova).')
    else: o.append('Veio da v2 anterior e foi reescrita para as mecânicas da OS v2.')
    if i in BRIDGE: o.append('Recebeu ponte/gatilho na verificação de cobertura (≥4 habilidades por tipo).')
    if i in NERF: o.append('Números reduzidos na calibração.')
    if i in ITEMUSED: o.append('Gatilho "quando você usa um item" (OS §9).')
    if i in DISABLE: o.append('Desativar (OS §9).')
    return ' '.join(o)

TN = {t['id']: t['name'] for t in D['types']}
def auto_note(s):
    ts = '/'.join(TN[t] for t in s['types'])
    if s['baby']:
        return (f'Bebê ({ts}): entra na loja como primeiro estágio, com orçamento ×0,8. Serve para fusão e para contadores de evolução.', 'Mew (Ancestral) e o treinador Domador fortalecem quem não tem habilidade.', '')
    return (f'Primeiro estágio sem habilidade ({ts}): só os stats do tipo. Peça de fusão; o valor real aparece ao evoluir.', 'Mew (Ancestral) e Domador; em times do mesmo tipo da evolução.', '')

LAB = [('dmg', 'Dano'), ('spectral', 'Espectral'), ('heal', 'Cura'), ('cleanse', 'Limpeza %'), ('shield', 'Escudo'), ('armor', 'Armadura'),
       ('burn', 'Queimadura'), ('poison', 'Veneno'), ('shock', 'Choque'), ('cold', 'Frio'), ('growth', 'Crescimento %'), ('crit', 'Crítico %'),
       ('charge', 'Carga'), ('swarm', 'Enxame'), ('echo', 'Eco %'), ('punish', 'Punir %'), ('blessing', 'Bênção'), ('hp', 'HP do time'), ('cd', 'Recarga (s)'), ('casts', 'Multicast')]
def stat_table(s):
    lv = s['stats']
    hdr = [P('<b>Stat</b>', 'cell')] + [P(f'<b>Lv{i + 1}</b>', 'cell') for i in range(len(lv))]
    rows = [hdr]
    for k, lab in LAB:
        vals = [x.get(k, 0) for x in lv]
        if k == 'casts' and all(v <= 1 for v in vals): continue
        if not any(vals): continue
        rows.append([P(lab, 'cell')] + [P(fmt(v) if isinstance(v, (int, float)) else str(v), 'cell') for v in vals])
    if lv[0].get('pierce'): rows.append([P('Perfurar', 'cell')] + [P(f'{x["pierce"]}x', 'cell') for x in lv])
    cw = [24 * mm] + [16 * mm] * len(lv)
    return Table(rows, colWidths=cw, style=TableStyle([('GRID', (0, 0), (-1, -1), 0.3, LINE), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f1f6')),
                                                        ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))

RCOL = ['', '#8e9aa6', '#5cb85c', '#3d8fd6', '#9b5bd6', '#f08a24', '#e8435a']
seen = set()
bases = []
for s in species:
    if s['base'] not in seen:
        seen.add(s['base']); bases.append(s['base'])
by_id = {s['id']: s for s in species}
for b in bases:
    members = [by_id[m] for m in by_id[b]['line'] if m in by_id]
    head = ' → '.join(m['name'] for m in members)
    S.append(CondPageBreak(60 * mm))
    S.append(P(f'<font color="{RCOL[by_id[b]["rarity"]]}">■</font> {esc(head)}', 'h2'))
    for s in members:
        a = s['ability']
        note = NOTES.get(s['id']) or auto_note(s)
        info = [P(f'<b>#{s["id"]:03d} {esc(s["name"])}</b> &nbsp; ' + ' '.join(chip(t) for t in s['types']), 'body'),
                P(f'<font color="{RCOL[s["rarity"]]}"><b>{s["rarityName"]}</b></font> · orçamento {s["budget"]} (BST {s["bst"]}, estágio ×{s["stageFactor"]}) · '
                  + (f'na loja por ₽{s["price"]}' if s['inShop'] else 'não aparece na loja (evolução ou evento)'), 'small')]
        if s['evo']: info.append(P(f'<b>Evolução:</b> {esc(s["evo"])}', 'small'))
        if a['none']:
            info.append(P('<b>Habilidade:</b> <i>nenhuma</i>', 'body'))
        else:
            info.append(P(f'<b>Habilidade — {esc(a["name"])}:</b> {esc(a["desc"])}', 'body'))
            if a['descLv3'] != a['desc']: info.append(P(f'<i>No Lv3:</i> {esc(a["descLv3"])}', 'small'))
            info.append(P(f'Gatilhos no código: {", ".join(a["hooks"]) or "—"}', 'small'))
        if s['shiny']:
            info.append(P(f'<font color="#8a6a00"><b>★ Shiny — {esc(s["shiny"]["name"])}:</b> {esc(s["shiny"]["desc"])}</font>', 'body'))
        else:
            info.append(P('★ Shiny: +20% no orçamento e nos números da habilidade (sem versão própria).', 'small'))
        left = Table([[sprite(s['id']), sprite(s['id'], True, 30)]], colWidths=[18 * mm, 14 * mm], style=TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
        st = stat_table(s)
        stw = st._argW and sum(st._argW) or 80 * mm
        top = Table([[left, info, st]], colWidths=[33 * mm, W - 33 * mm - stw - 2 * mm, stw + 2 * mm],
                    style=TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 2), ('RIGHTPADDING', (0, 0), (-1, -1), 2)]))
        design = [P(f'<b>Ideia:</b> {esc(note[0])}', 'body'), P(f'<b>Combina com:</b> {esc(note[1])}', 'body'), P(f'<b>Origem:</b> {esc(origin(s))}', 'small')]
        if note[2]: design.append(P(f'<font color="#c0392b"><b>Atenção:</b> {esc(note[2])}</font>', 'small'))
        box = Table([[top], [design], [NoteField(f'pk_{s["id"]}', height=26)]], colWidths=[W],
                    style=TableStyle([('BOX', (0, 0), (-1, -1), 0.6, LINE), ('LINEBEFORE', (0, 0), (0, -1), 3, colors.HexColor(RCOL[s['rarity']])),
                                      ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8f9fc')), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
        S.append(KeepTogether([box, Spacer(1, 5)]))

# ---------- 5. itens e treinadores ----------
S.append(PageBreak())
S.append(P(f'5. Itens segurados ({len(D["trinkets"])})', 'h1'))
RN = ['', 'Comum', 'Incomum', 'Raro', 'Super Raro', 'Lendário']
rows = [[P('<b>Item</b>', 'cell'), P('<b>Raridade</b>', 'cell'), P('<b>Efeito</b>', 'cell')]]
for t in sorted(D['trinkets'], key=lambda x: x['rarity']):
    rows.append([P(f'<b>{esc(t["name"])}</b>' + (' (único)' if t.get('unique') else ''), 'cell'), P(RN[t['rarity']], 'cell'), P(esc(t['desc']), 'cell')])
S.append(Table(rows, colWidths=[40 * mm, 20 * mm, W - 60 * mm], repeatRows=1, style=TableStyle([('GRID', (0, 0), (-1, -1), 0.3, LINE), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f1f6'))])))
S.append(NoteField('itens_segurados', height=40))
S.append(P(f'6. Itens da loja ({len(D["items"])})', 'h1'))
rows = [[P('<b>Item</b>', 'cell'), P('<b>Preço</b>', 'cell'), P('<b>Efeito</b>', 'cell')]]
for t in D['items']:
    rows.append([P(f'<b>{esc(t["name"])}</b>', 'cell'), P(f'₽{t["price"]}' if t['price'] else 'Grátis', 'cell'), P(esc(t['desc']), 'cell')])
S.append(Table(rows, colWidths=[40 * mm, 16 * mm, W - 56 * mm], repeatRows=1, style=TableStyle([('GRID', (0, 0), (-1, -1), 0.3, LINE), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f1f6'))])))
S.append(NoteField('itens_loja', height=40))
S.append(P(f'7. Treinadores ({len(D["trainers"])})', 'h1'))
rows = [[P('<b>Treinador</b>', 'cell'), P('<b>Efeito</b>', 'cell')]] + [[P(f'<b>{esc(t["title"])}</b>', 'cell'), P(esc(t['desc']), 'cell')] for t in D['trainers']]
S.append(Table(rows, colWidths=[40 * mm, W - 40 * mm], repeatRows=1, style=TableStyle([('GRID', (0, 0), (-1, -1), 0.3, LINE), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f1f6'))])))
S.append(NoteField('treinadores', height=40))
S.append(P('Notas gerais da auditoria', 'h1'))
S.append(NoteField('geral', label='Observações gerais', height=220, boxes=False))

doc.build(S)
print('ok', OUT, FIELD_ID[0], 'blocos editáveis')
