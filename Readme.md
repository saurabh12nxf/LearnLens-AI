# LearnLens AI — Personalized Learning & Learner Analytics System

## 📌 Project Overview

**LearnLens AI** is a data-driven personalized learning system designed to help students understand their learning material and make better study decisions using their study resources and learning history.

The system combines **Advanced Data Science, Machine Learning, Deep Learning, Information Retrieval, Recommendation Systems, and Generative AI** to:

- Retrieve relevant information from learning resources.
- Provide source-grounded answers using RAG.
- Analyze student learning and assessment data.
- Identify knowledge gaps and weak topics.
- Recommend personalized topics and practice activities.
- Generate personalized explanations, quizzes, and basic study/revision plans.

---

## 🎯 Problem Statement

Students often have difficulty identifying which concepts they understand well and which concepts require more practice.

At the same time, large study resources can make it difficult to quickly find the information relevant to a particular question or topic.

Traditional learning systems often provide the same resources and assessments to every student without considering their individual performance and learning history.

**LearnLens AI** aims to solve this problem using a data-driven approach that analyzes learning resources and learner data to provide personalized learning support.

---

## 🎯 Project Goals

The main goals of LearnLens AI are to:

1. Analyze student learning and assessment data.
2. Identify weak topics and knowledge gaps.
3. Retrieve relevant information from learning resources.
4. Provide grounded answers based on available study material.
5. Recommend topics and practice activities based on learner needs.
6. Provide personalized explanations and quizzes.
7. Generate basic personalized study and revision plans.
8. Evaluate the effectiveness of retrieval, analysis, and recommendation approaches.

---

## 👥 Target Users

- College and university students
- Technical learners
- Self-learners
- Online learners

---

## 🚀 Core Features

### 1. Learning Resource Processing

The system allows learning resources to be processed and prepared for analysis and retrieval.

The resource pipeline includes:

- Document loading
- Text extraction
- Text preprocessing
- Chunking
- Embedding generation
- Vector storage

---

### 2. Semantic Search

The system uses embeddings and vector similarity to retrieve relevant content from learning resources.

This allows the system to find conceptually related information rather than relying only on exact keyword matches.

---

### 3. RAG-Based Question Answering

LearnLens AI uses **Retrieval-Augmented Generation (RAG)** to provide answers based on the student's learning resources.

The basic pipeline is:

```text
Student Question
       ↓
Query Processing
       ↓
Semantic Retrieval
       ↓
Relevant Learning Content
       ↓
Context + Question
       ↓
Language Model
       ↓
Grounded Answer