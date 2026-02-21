Here are the **fields and core components** included in the **PADS (Parkinson’s Disease Smartwatch) dataset**, based on the official PhysioNet release and associated documentation:

### **1) Demographic & Personal Information**

From the subject-level file list (e.g., *file_list.csv*) you can see fields such as:

* **id / patient identifier** (pseudonymized)
* **condition** (group label: PD, other movement disorders, healthy control)
* **disease_comment** (text description of diagnosis)
* **age / age_at_diagnosis**
* **height / weight**
* **gender**
* **handedness**
* **appearance_in_kinship / in_first_grade_kinship** (family PD history)
* **effect_of_alcohol_on_tremor** (self-reported)
  This mirrors typical patient profile metadata for each subject. ([PhysioNet][1])

### **2) Clinical & Questionnaire Data**

Participants completed a structured **electronic questionnaire** that includes:

* **Non-motor symptom (PDNMS) responses**: 30 yes/no items based on the PDNMS questionnaire developed by the International Parkinson and Movement Disorder Society (e.g., gastrointestinal symptoms, sleep/fatigue issues, mood symptoms, hallucinations). ([PhysioNet][2])
* **Medical history details** (beyond motor symptoms) recorded alongside the wearable data. ([PhysioNet][2])

The PDNMS items cover multiple symptom categories, including:

* Gastrointestinal, Urinary, Pain
* Cognitive / apathy / attention
* Depression / anxiety
* Sleep / fatigue
* Sexual function
* Cardiovascular symptoms
  These are typically encoded as binary fields per symptom question. ([PhysioNet][2])

### **3) Movement Task Meta-Data**

For each **assessment step** (11 tasks designed by neurologists), the dataset includes:

* **Task labels** (e.g., resting, postural, kinetic tasks)
* **Task durations** (in seconds)
* **Recording identifiers** linking sensor streams to specific tasks. ([PhysioNet][2])

### **4) Time Series Sensor Signals**

For each movement task and each subject, the following time-resolved signals are included:

* **Accelerometer data** (e.g., acceleration in X/Y/Z axes)
* **Gyroscope data** (rotation rates in X/Y/Z axes)
* **Timestamps** (often normalized to start at 0 for each recording)
  These are the core high-resolution motion signals captured by two smartwatches worn on left and right wrists. ([PhysioNet][2])

### **5) Derived Metadata / Labels**

Alongside raw signals, the dataset includes ancillary data that supports modeling:

* **Diagnosis labels** (coded group: PD, differential diagnoses, healthy control)
* **ICD-10 confirmed clinical diagnosis**
* **Quality control flags** (e.g., records removed if erroneous)
  These help stratify and filter data for training or validation. ([PhysioNet][2])

---

### **Summary of Data Tables / Typical Fields**

| Category                     | Example Fields                                                            |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Subject Demographics**     | id, age, gender, height, weight, handedness                               |
| **Clinical / Questionnaire** | PDNMS responses (symptom1 … symptom30), family PD history, alcohol effect |
| **Movement Task Metadata**   | task_id, task_label, duration                                             |
| **Sensor Time Series**       | accel_X/Y/Z, gyro_X/Y/Z, timestamp                                        |
| **Diagnosis / Labels**       | condition group (PD / DD / HC), disease_comment                           |

This organization makes PADS suitable for supervised learning (classification of PD/controls), analysis of motor symptom patterns, and correlating sensor features with clinical symptom scores. ([PhysioNet][2])

If you need **actual schema files** (CSV column lists, JSON formats) or example code for ingesting PADS data, I can provide that next.

[1]: https://physionet.org/content/parkinsons-disease-smartwatch/1.0.0/preprocessed/file_list.csv?utm_source=chatgpt.com "file_list.csv - PADS - Parkinsons Disease Smartwatch dataset"
[2]: https://physionet.org/content/parkinsons-disease-smartwatch/1.0.0/?utm_source=chatgpt.com "PADS - Parkinsons Disease Smartwatch dataset v1.0.0 - PhysioNet"
