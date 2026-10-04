import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { ALatinLetterCharacteristicsService } from "./a-latin-letter-characteristics.service";
import { AinArabicLetterCharacteristicsService } from "./ain-arabic-letter-characteristics.service";
import { AlefArabicLetterCharacteristicsService } from "./alef-arabic-letter-characteristics.service";
import { AoHanziLetterCharacteristicsService } from "./ao-hanzi-letter-characteristics.service";
import { BLatinLetterCharacteristicsService } from "./b-latin-letter-characteristics.service";
import { BehArabicLetterCharacteristicsService } from "./beh-arabic-letter-characteristics.service";
import { CLatinLetterCharacteristicsService } from "./c-latin-letter-characteristics.service";
import { DalArabicLetterCharacteristicsService } from "./dal-arabic-letter-characteristics.service";
import { DaletHebrewLetterCharacteristicsService } from "./dalet-hebrew-letter-characteristics.service";
import { DeltaGreekLetterCharacteristicsService } from "./delta-greek-letter-characteristics.service";
import { ELatinLetterCharacteristicsService } from "./e-latin-letter-characteristics.service";
import { FLatinLetterCharacteristicsService } from "./f-latin-letter-characteristics.service";
import { FehArabicLetterCharacteristicsService } from "./feh-arabic-letter-characteristics.service";
import { GanHanziLetterCharacteristicsService } from "./gan-hanzi-letter-characteristics.service";
import { HLatinLetterCharacteristicsService } from "./h-latin-letter-characteristics.service";
import { HahArabicLetterCharacteristicsService } from "./hah-arabic-letter-characteristics.service";
import { HehArabicLetterCharacteristicsService } from "./heh-arabic-letter-characteristics.service";
import { ILatinLetterCharacteristicsService } from "./i-latin-letter-characteristics.service";
import { JiaHanziLetterCharacteristicsService } from "./jia-hanzi-letter-characteristics.service";
import { JingHanziLetterCharacteristicsService } from "./jing-hanzi-letter-characteristics.service";
import { KafArabicLetterCharacteristicsService } from "./kaf-arabic-letter-characteristics.service";
import { KappaGreekLetterCharacteristicsService } from "./kappa-greek-letter-characteristics.service";
import { KieukHangulLetterCharacteristicsService } from "./kieuk-hangul-letter-characteristics.service";
import { LLatinLetterCharacteristicsService } from "./l-latin-letter-characteristics.service";
import { LamArabicLetterCharacteristicsService } from "./lam-arabic-letter-characteristics.service";
import { LambdaGreekLetterCharacteristicsService } from "./lambda-greek-letter-characteristics.service";
import { LamedHebrewLetterCharacteristicsService } from "./lamed-hebrew-letter-characteristics.service";
import { LetterUtilitiesService } from "./letter-utilities.service";
import { MLatinLetterCharacteristicsService } from "./m-latin-letter-characteristics.service";
import { MeemArabicLetterCharacteristicsService } from "./meem-arabic-letter-characteristics.service";
import { MuHanziLetterCharacteristicsService } from "./mu-hanzi-letter-characteristics.service";
import { NLatinLetterCharacteristicsService } from "./n-latin-letter-characteristics.service";
import { NoonArabicLetterCharacteristicsService } from "./noon-arabic-letter-characteristics.service";
import { OLatinLetterCharacteristicsService } from "./o-latin-letter-characteristics.service";
import { OmegaGreekLetterCharacteristicsService } from "./omega-greek-letter-characteristics.service";
import { PhiGreekLetterCharacteristicsService } from "./phi-greek-letter-characteristics.service";
import { PieupHangulLetterCharacteristicsService } from "./pieup-hangul-letter-characteristics.service";
import { PsiGreekLetterCharacteristicsService } from "./psi-greek-letter-characteristics.service";
import { QafArabicLetterCharacteristicsService } from "./qaf-arabic-letter-characteristics.service";
import { RehArabicLetterCharacteristicsService } from "./reh-arabic-letter-characteristics.service";
import { RhoGreekLetterCharacteristicsService } from "./rho-greek-letter-characteristics.service";
import { SLatinLetterCharacteristicsService } from "./s-latin-letter-characteristics.service";
import { SadArabicLetterCharacteristicsService } from "./sad-arabic-letter-characteristics.service";
import { SeenArabicLetterCharacteristicsService } from "./seen-arabic-letter-characteristics.service";
import { ShangHanziLetterCharacteristicsService } from "./shang-hanzi-letter-characteristics.service";
import { ShenHanziLetterCharacteristicsService } from "./shen-hanzi-letter-characteristics.service";
import { SigmaGreekLetterCharacteristicsService } from "./sigma-greek-letter-characteristics.service";
import { TLatinLetterCharacteristicsService } from "./t-latin-letter-characteristics.service";
import { TahArabicLetterCharacteristicsService } from "./tah-arabic-letter-characteristics.service";
import { TavHebrewLetterCharacteristicsService } from "./tav-hebrew-letter-characteristics.service";
import { TianHanziLetterCharacteristicsService } from "./tian-hanzi-letter-characteristics.service";
import { TuHanziLetterCharacteristicsService } from "./tu-hanzi-letter-characteristics.service";
import { TuSoilHanziLetterCharacteristicsService } from "./tu-soil-hanzi-letter-characteristics.service";
import { ULatinLetterCharacteristicsService } from "./u-latin-letter-characteristics.service";
import { WLatinLetterCharacteristicsService } from "./w-latin-letter-characteristics.service";
import { WangHanziLetterCharacteristicsService } from "./wang-hanzi-letter-characteristics.service";
import { WawArabicLetterCharacteristicsService } from "./waw-arabic-letter-characteristics.service";
import { XLatinLetterCharacteristicsService } from "./x-latin-letter-characteristics.service";
import { YLatinLetterCharacteristicsService } from "./y-latin-letter-characteristics.service";
import { YaHangulLetterCharacteristicsService } from "./ya-hangul-letter-characteristics.service";
import { YehArabicLetterCharacteristicsService } from "./yeh-arabic-letter-characteristics.service";
import { YeoHangulLetterCharacteristicsService } from "./yeo-hangul-letter-characteristics.service";
import { YoHangulLetterCharacteristicsService } from "./yo-hangul-letter-characteristics.service";
import { YouHanziLetterCharacteristicsService } from "./you-hanzi-letter-characteristics.service";
import { YuHangulLetterCharacteristicsService } from "./yu-hangul-letter-characteristics.service";
import { YuKatakanaLetterCharacteristicsService } from "./yu-katakana-letter-characteristics.service";
import { ZLatinLetterCharacteristicsService } from "./z-latin-letter-characteristics.service";

/**
 * Provides and exports every letter service — Latin, Greek, Hebrew,
 * Arabic, katakana, hanzi, and hangul, one service per letter, an Arabic
 * letter's positional forms together in one — as one group
 * `CharacteristicsModule` imports and re-exports, along with the
 * `LetterUtilitiesService` orientation arithmetic they inject.
 *
 * Each letter holds one base template, or one per positional form for an
 * Arabic letter, facing its script's reading corner — Southeast, or
 * Southwest for Hebrew and Arabic — and provides sixteen evaluators per
 * template, one per orientation: each corner (the base, its east–west
 * mirror, its north–south mirror, and both) turned by none, a quarter, a
 * half, or three quarters clockwise. Names that draw the same ink count it
 * alike, and letters that are orientations of one another share ink too.
 */
@Module({
  controllers: [],
  exports: [
    LetterUtilitiesService,
    ALatinLetterCharacteristicsService,
    AinArabicLetterCharacteristicsService,
    AlefArabicLetterCharacteristicsService,
    AoHanziLetterCharacteristicsService,
    BLatinLetterCharacteristicsService,
    BehArabicLetterCharacteristicsService,
    CLatinLetterCharacteristicsService,
    DalArabicLetterCharacteristicsService,
    DaletHebrewLetterCharacteristicsService,
    DeltaGreekLetterCharacteristicsService,
    ELatinLetterCharacteristicsService,
    FLatinLetterCharacteristicsService,
    FehArabicLetterCharacteristicsService,
    GanHanziLetterCharacteristicsService,
    HLatinLetterCharacteristicsService,
    HahArabicLetterCharacteristicsService,
    HehArabicLetterCharacteristicsService,
    ILatinLetterCharacteristicsService,
    JiaHanziLetterCharacteristicsService,
    JingHanziLetterCharacteristicsService,
    KafArabicLetterCharacteristicsService,
    KappaGreekLetterCharacteristicsService,
    KieukHangulLetterCharacteristicsService,
    LLatinLetterCharacteristicsService,
    LamArabicLetterCharacteristicsService,
    LambdaGreekLetterCharacteristicsService,
    LamedHebrewLetterCharacteristicsService,
    MLatinLetterCharacteristicsService,
    MeemArabicLetterCharacteristicsService,
    MuHanziLetterCharacteristicsService,
    NLatinLetterCharacteristicsService,
    NoonArabicLetterCharacteristicsService,
    OLatinLetterCharacteristicsService,
    OmegaGreekLetterCharacteristicsService,
    PhiGreekLetterCharacteristicsService,
    PieupHangulLetterCharacteristicsService,
    PsiGreekLetterCharacteristicsService,
    QafArabicLetterCharacteristicsService,
    RehArabicLetterCharacteristicsService,
    RhoGreekLetterCharacteristicsService,
    SLatinLetterCharacteristicsService,
    SadArabicLetterCharacteristicsService,
    SeenArabicLetterCharacteristicsService,
    ShangHanziLetterCharacteristicsService,
    ShenHanziLetterCharacteristicsService,
    SigmaGreekLetterCharacteristicsService,
    TLatinLetterCharacteristicsService,
    TahArabicLetterCharacteristicsService,
    TavHebrewLetterCharacteristicsService,
    TianHanziLetterCharacteristicsService,
    TuHanziLetterCharacteristicsService,
    TuSoilHanziLetterCharacteristicsService,
    ULatinLetterCharacteristicsService,
    WLatinLetterCharacteristicsService,
    WangHanziLetterCharacteristicsService,
    WawArabicLetterCharacteristicsService,
    XLatinLetterCharacteristicsService,
    YLatinLetterCharacteristicsService,
    YaHangulLetterCharacteristicsService,
    YehArabicLetterCharacteristicsService,
    YeoHangulLetterCharacteristicsService,
    YoHangulLetterCharacteristicsService,
    YouHanziLetterCharacteristicsService,
    YuHangulLetterCharacteristicsService,
    YuKatakanaLetterCharacteristicsService,
    ZLatinLetterCharacteristicsService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    LetterUtilitiesService,
    ALatinLetterCharacteristicsService,
    AinArabicLetterCharacteristicsService,
    AlefArabicLetterCharacteristicsService,
    AoHanziLetterCharacteristicsService,
    BLatinLetterCharacteristicsService,
    BehArabicLetterCharacteristicsService,
    CLatinLetterCharacteristicsService,
    DalArabicLetterCharacteristicsService,
    DaletHebrewLetterCharacteristicsService,
    DeltaGreekLetterCharacteristicsService,
    ELatinLetterCharacteristicsService,
    FLatinLetterCharacteristicsService,
    FehArabicLetterCharacteristicsService,
    GanHanziLetterCharacteristicsService,
    HLatinLetterCharacteristicsService,
    HahArabicLetterCharacteristicsService,
    HehArabicLetterCharacteristicsService,
    ILatinLetterCharacteristicsService,
    JiaHanziLetterCharacteristicsService,
    JingHanziLetterCharacteristicsService,
    KafArabicLetterCharacteristicsService,
    KappaGreekLetterCharacteristicsService,
    KieukHangulLetterCharacteristicsService,
    LLatinLetterCharacteristicsService,
    LamArabicLetterCharacteristicsService,
    LambdaGreekLetterCharacteristicsService,
    LamedHebrewLetterCharacteristicsService,
    MLatinLetterCharacteristicsService,
    MeemArabicLetterCharacteristicsService,
    MuHanziLetterCharacteristicsService,
    NLatinLetterCharacteristicsService,
    NoonArabicLetterCharacteristicsService,
    OLatinLetterCharacteristicsService,
    OmegaGreekLetterCharacteristicsService,
    PhiGreekLetterCharacteristicsService,
    PieupHangulLetterCharacteristicsService,
    PsiGreekLetterCharacteristicsService,
    QafArabicLetterCharacteristicsService,
    RehArabicLetterCharacteristicsService,
    RhoGreekLetterCharacteristicsService,
    SLatinLetterCharacteristicsService,
    SadArabicLetterCharacteristicsService,
    SeenArabicLetterCharacteristicsService,
    ShangHanziLetterCharacteristicsService,
    ShenHanziLetterCharacteristicsService,
    SigmaGreekLetterCharacteristicsService,
    TLatinLetterCharacteristicsService,
    TahArabicLetterCharacteristicsService,
    TavHebrewLetterCharacteristicsService,
    TianHanziLetterCharacteristicsService,
    TuHanziLetterCharacteristicsService,
    TuSoilHanziLetterCharacteristicsService,
    ULatinLetterCharacteristicsService,
    WLatinLetterCharacteristicsService,
    WangHanziLetterCharacteristicsService,
    WawArabicLetterCharacteristicsService,
    XLatinLetterCharacteristicsService,
    YLatinLetterCharacteristicsService,
    YaHangulLetterCharacteristicsService,
    YehArabicLetterCharacteristicsService,
    YeoHangulLetterCharacteristicsService,
    YoHangulLetterCharacteristicsService,
    YouHanziLetterCharacteristicsService,
    YuHangulLetterCharacteristicsService,
    YuKatakanaLetterCharacteristicsService,
    ZLatinLetterCharacteristicsService,
  ],
})
export class LetterCharacteristicsModule {}
