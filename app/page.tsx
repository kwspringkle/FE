"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Carousel } from "@/components/Carousel";

export default function LandingPage() {
  const features = [
    {
      title: "人気ランキング",
      description:
        "お客様の評価とお気に入りに基づいて、最も人気のある料理を発見",
      image: "/pho-noodle-soup-authentic-vietnamese.jpg",
    },
    {
      title: "詳細検索",
      description: "材料、調理方法、または食事の好みで簡単に検索",
      image: "/banh-mi-vietnamese-sandwich.jpg",
    },
    {
      title: "レビュー機能",
      description:
        "実際のお客様からの本物のレビューを読んで、あなたの経験を共有",
      image: "/spring-rolls-fresh-vietnamese.jpg",
    },
    {
      title: "AI紹介サポート",
      description: "AIが日本語で料理紹介スクリプトを自動生成",
      image: "/authentic-vietnamese-pho-restaurant-with-vibrant-c.jpg",
    },
  ];

  const aboutItems = [
    {
      title: "ベトめしガイドとは？",
      description:
        "ベトめしガイドは、本格的なベトナム料理を発見するのを支援するプラットフォームです。信頼できるレストランとつながり、伝統的で現代的な料理を案内します。材料、味、アレルギーに関する情報を探している場合でも、あなたの好みに合うレストランを簡単に見つけることができます。",
      features: [
        "あなたの味に合ったレストランを発見",
        "材料とアレルゲンに関する詳細情報",
        "実際の食事客からの本物のレビュー",
      ],
      image: "/vietnamese-food-table-spread.png",
    },
    {
      title: "なぜベトめしガイド？",
      description:
        "ハノイで学ぶベトナム人学生が、日本人の教師や学生に自信を持ってベトナム料理を紹介できるよう支援します。料理の味の特性、日本人の口に合うかどうか、アレルギー情報、近くの店など、必要な情報を完全に提供します。",
      features: [
        "日本人の味覚に合わせた料理情報",
        "アレルギー情報の詳細提供",
        "近くのレストラン検索機能",
      ],
      image: "/authentic-vietnamese-pho-restaurant-with-vibrant-c.jpg",
    },
    {
      title: "使い方",
      description:
        "簡単にレストランや料理を検索し、詳細な情報を確認できます。お気に入りを保存したり、レビューを投稿したり、AIのサポートで日本語での紹介文を作成することもできます。",
      features: ["簡単な検索機能", "お気に入り機能", "AI紹介サポート"],
      image: "/pho-noodle-soup-authentic-vietnamese.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            ベトめしガイド
          </h1>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-foreground hover:text-amber-500 transition-colors duration-300 font-medium"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="text-sm text-foreground hover:text-amber-500 transition-colors duration-300 font-medium"
            >
              新規登録
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 sm:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shadow-lg">
              <Image
                src="/pho-noodle-soup-authentic-vietnamese.jpg"
                alt="Vietnamese Pho - Authentic dish"
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="max-w-2xl">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
                ベトめしガイド
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
                ハノイで学ぶベトナム人学生と、日本人教師や学生にベトナム料理を自信を持って紹介できるようにするプラットフォームです。料理の味の特性、日本人の口に合わせかどうか、アレルギー情報、近くの店など、必要な情報を完全に提供します。
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  className="px-8 py-6 rounded-full font-semibold text-base border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background transition-all hover:scale-105 shadow-md hover:shadow-lg"
                  size="lg"
                >
                  <Link href="/login">ログイン</Link>
                </Button>
                <Button
                  asChild
                  className="px-8 py-6 rounded-full font-semibold text-base border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background transition-all hover:scale-105 shadow-md hover:shadow-lg"
                  size="lg"
                >
                  <Link href="/register">新規登録</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Auto Carousel */}
      <section className="px-6 sm:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
            主な機能
          </h3>

          {/* Auto Carousel */}
          <Carousel
            items={features}
            autoPlay={true}
            autoPlayInterval={4000}
            showNavigation={true}
          />
        </div>
      </section>

      {/* About Section with Auto Carousel */}
      <section className="px-6 sm:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
            ベトめしガイドとは？
          </h3>

          {/* Auto Carousel */}
          <Carousel
            items={aboutItems}
            autoPlay={true}
            autoPlayInterval={6000}
            showNavigation={true}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 sm:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            今すぐベトナム料理を探索しよう
          </h3>
          <p className="text-muted-foreground mb-8">
            無料で登録して、ハノイの美味しいレストラン料理を発見しましょう
          </p>
          <Button
            asChild
            className="px-8 py-6 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105"
            size="lg"
          >
            <Link href="/register">無料で始める</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-8 py-8 bg-secondary/30 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 ベトめしガイド. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
