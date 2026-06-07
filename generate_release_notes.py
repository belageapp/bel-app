#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# 日本語フォント登録
pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))

FONT_MIN  = 'HeiseiMin-W3'
FONT_KAKU = 'HeiseiKakuGo-W5'

W, H = A4
MARGIN = 18 * mm

GREEN      = colors.HexColor('#1D9E75')
GREEN_LIGHT= colors.HexColor('#E0F5ED')
ORANGE     = colors.HexColor('#E65100')
BLUE       = colors.HexColor('#1565C0')
GRAY       = colors.HexColor('#555555')
GRAY_LIGHT = colors.HexColor('#F4F6F8')
BORDER     = colors.HexColor('#E8EAED')
WHITE      = colors.white

def styles():
    return {
        'doc_title': ParagraphStyle('doc_title', fontName=FONT_KAKU, fontSize=20,
                                    textColor=GREEN, spaceAfter=4, leading=28),
        'doc_sub':   ParagraphStyle('doc_sub', fontName=FONT_MIN, fontSize=11,
                                    textColor=GRAY, spaceAfter=2),
        'ver_label': ParagraphStyle('ver_label', fontName=FONT_KAKU, fontSize=13,
                                    textColor=WHITE, leading=18),
        'section':   ParagraphStyle('section', fontName=FONT_KAKU, fontSize=11,
                                    textColor=GREEN, spaceAfter=4, spaceBefore=8),
        'item_head': ParagraphStyle('item_head', fontName=FONT_KAKU, fontSize=10,
                                    textColor=colors.HexColor('#222222'), spaceAfter=2),
        'item_body': ParagraphStyle('item_body', fontName=FONT_MIN, fontSize=9.5,
                                    textColor=GRAY, leading=15, spaceAfter=1,
                                    leftIndent=10),
        'footer':    ParagraphStyle('footer', fontName=FONT_MIN, fontSize=8,
                                    textColor=colors.HexColor('#aaaaaa')),
    }

def ver_header(date, version, subtitle, s):
    data = [[
        Paragraph(f'<b>{version}</b>　　{date}', s['ver_label']),
        Paragraph(subtitle, ParagraphStyle('vs2', fontName=FONT_MIN, fontSize=9.5,
                                           textColor=WHITE, leading=14))
    ]]
    t = Table(data, colWidths=[55*mm, W - 2*MARGIN - 55*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREEN),
        ('ROUNDEDCORNERS', [6]),
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

def feature_row(icon, title, bullets, s):
    """アイコン付き機能行"""
    icon_para  = Paragraph(icon, ParagraphStyle('ic', fontName=FONT_KAKU, fontSize=16,
                                                 textColor=GREEN, alignment=1))
    title_para = Paragraph(f'<b>{title}</b>', s['item_head'])
    body_parts = [title_para]
    for b in bullets:
        body_parts.append(Paragraph(f'• {b}', s['item_body']))

    from reportlab.platypus import KeepTogether
    cell_right = body_parts

    t = Table([[icon_para, cell_right]], colWidths=[12*mm, W - 2*MARGIN - 12*mm])
    t.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING',   (0,0), (-1,-1), 0),
        ('RIGHTPADDING',  (0,0), (-1,-1), 0),
    ]))
    return t

def build():
    s = styles()
    out = '/Users/hasegawatakeshi/Desktop/release_notes_20260606_07.pdf'
    doc = SimpleDocTemplate(out, pagesize=A4,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)

    story = []

    # ── タイトル ──────────────────────────────────────────────
    story.append(Paragraph('機能アップデートのお知らせ', s['doc_title']))
    story.append(Paragraph('ベルアージュ業務支援システム　2026年6月6日・7日リリース', s['doc_sub']))
    story.append(HRFlowable(width='100%', thickness=2, color=GREEN, spaceAfter=10))
    story.append(Spacer(1, 4))

    # ── v1.2.0 (6/6) ─────────────────────────────────────────
    story.append(ver_header('2026年6月6日', 'v1.2.0', '速報入力・設定・朝礼報告の強化', s))
    story.append(Spacer(1, 8))

    story.append(Paragraph('■ 速報入力（daily）', s['section']))

    story.append(feature_row('📅', '日付の前後移動ボタンを追加',
        ['入力画面の日付欄に「‹」「›」ボタンが付き、1日ずつ移動できるようになりました。'],
        s))
    story.append(Spacer(1, 4))
    story.append(feature_row('📋', '入力履歴テーブルの表示項目を拡充',
        ['履歴に「予定人数・問合数・見学数・契約数・コメント」が表示されるようになりました。',
         '予定人数は dailyPlanned のデータを優先して表示します。'],
        s))
    story.append(Spacer(1, 4))
    story.append(feature_row('🔑', 'エリアマネジャーも自動ログイン対応',
        ['事業所マネジャーに加え、エリアマネジャーもログイン後に担当事業所へ自動移動します。'],
        s))

    story.append(Spacer(1, 6))
    story.append(Paragraph('■ 設定（settings）', s['section']))
    story.append(feature_row('👤', '事業所に「担当マネジャー」を設定できるように',
        ['事業所一覧に担当マネジャー列を追加。ユニット・エリアマネジャーをプルダウンで設定できます。'],
        s))

    story.append(Spacer(1, 6))
    story.append(Paragraph('■ 朝礼報告（morning-report）', s['section']))
    story.append(feature_row('📊', '朝礼報告（週次）を新規追加',
        ['マネジャー向けの週次まとめレポート画面を新設しました。',
         '週次集計・目標設定・レポート保存・過去一覧の機能を備えています。'],
        s))

    story.append(Spacer(1, 6))
    story.append(Paragraph('■ データ管理', s['section']))
    story.append(feature_row('📥', 'R8.5（令和8年5月）速報データ一括取込ツールを追加',
        ['過去データの Firestore 移行・再取込が可能なツールを追加しました。'],
        s))
    story.append(feature_row('👥', 'ユーザー一覧 CSV エクスポート機能を追加（6/1）',
        ['登録済みユーザーの一覧を CSV でダウンロードできるようになりました。'],
        s))

    story.append(Spacer(1, 14))

    # ── v1.3.0 / v1.4.0 / v1.5.0 (6/7) ──────────────────────
    story.append(ver_header('2026年6月7日', 'v1.3.0 〜 v1.5.0', '進捗バー・週次報告改修・ダッシュボード追加', s))
    story.append(Spacer(1, 8))

    story.append(Paragraph('■ 速報入力（daily）— v1.3.0', s['section']))
    story.append(feature_row('🃏', '入力画面を2カード構成に整理',
        ['Card 1：入力フォームと送信ボタン',
         'Card 2：進捗バー・週次予定・入力履歴',
         '事業所を選ぶ前はCard 2が非表示になり、画面がすっきりしました。'],
        s))
    story.append(Spacer(1, 4))
    story.append(feature_row('💾', '未保存インジケーターを追加',
        ['数値を変えて未送信の状態のとき「● 未保存」と表示されます。誤って画面を閉じる前に気づけます。'],
        s))
    story.append(Spacer(1, 4))
    story.append(feature_row('📈', 'ペースライン付き進捗バーを全画面に追加',
        ['今日時点で「順調か・遅れているか」をバーの色で一目で確認できます。',
         '緑＝実績分　橙＝ペース未達のギャップ　青＝ペースを上回るサープラス',
         'バー右に「+N名 順調」「N名遅れ」のテキストも表示します。'],
        s))

    story.append(Spacer(1, 6))
    story.append(Paragraph('■ 朝礼報告（morning-report）— v1.4.0', s['section']))
    story.append(feature_row('📆', '週の単位を日〜土に統一',
        ['これまでの木〜水から日曜始まり・土曜終わりに変更しました。'],
        s))
    story.append(Spacer(1, 4))
    story.append(feature_row('📋', '報告週の直前5週を集計テーブルで一覧表示',
        ['各週の「定員合計・予定合計・実績合計・平均・達成率」を5行で確認できます。',
         '週ラベルを「6/1-6/7」形式の日付範囲に変更し、月をまたいでも混乱しません。'],
        s))
    story.append(Spacer(1, 4))
    story.append(feature_row('📊', '各事業所カードに月次進捗バーを追加',
        ['報告週が2つの月にまたがる場合は、両月のバーを並べて表示します。',
         '日次入力画面と同じペースライン付きバーで次週目標の設定に活用できます。'],
        s))

    story.append(Spacer(1, 6))
    story.append(Paragraph('■ ポータル（index）— v1.5.0', s['section']))
    story.append(feature_row('🏠', '貢献ダッシュボードをポータル画面に追加',
        ['全事業所の当月進捗を部署→エリア→事業所の階層で一覧できます。',
         '「‹」「›」ボタンで前後の月に切り替えられます。',
         'エリア名をタップするとそのエリアの事業所一覧が展開します。',
         'ロールに応じて最初から開いておく範囲が変わります（admin/エリアマネジャー＝全開、その他＝所属エリアのみ）。'],
        s))

    story.append(Spacer(1, 6))
    story.append(Paragraph('■ Chatwork 速報（自動投稿）— v1.3.0', s['section']))
    story.append(feature_row('✅', 'チャット投稿の文字ズレ・グラフズレを修正',
        ['全角・半角が混在する列の縦ズレを解消しました。',
         '達成率グラフのバー長さが不揃いになっていた問題を修正しました。',
         '事業所名を2文字略称に統一し、見やすくなりました（はぐ・井口・高陽生 など）。'],
        s))

    # ── フッター ─────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6))
    story.append(Paragraph('ベルアージュ業務支援システム　システム管理担当　2026年6月7日発行',
                            s['footer']))

    doc.build(story)
    print(f'生成完了: {out}')

if __name__ == '__main__':
    build()
