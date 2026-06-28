import os
import re

file_path = "server.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace initialization
code = re.sub(
    r'import \{ initializeApp \} from "firebase/app";\s*import \{[^}]*\} from "firebase/firestore";',
    "import * as admin from 'firebase-admin';",
    code,
    flags=re.MULTILINE
)

code = re.sub(
    r'const firebaseApp = initializeApp\(firebaseConfig\);\s*const db = getFirestore\(firebaseApp, firebaseConfig\.firestoreDatabaseId\);',
    "admin.initializeApp({ projectId: firebaseConfig.projectId });\nconst db = admin.firestore();",
    code
)

# Convert sync getUidFromAuthHeader to async
code = code.replace(
    "function getUidFromAuthHeader(header?: string): string {",
    "async function getUidFromAuthHeader(header?: string): Promise<string> {"
)
# Make verifyIdToken async
code = code.replace(
    "const payload = JSON.parse(\n        Buffer.from(parts[1], \"base64\").toString(\"utf8\")\n      );\n      if (typeof payload.user_id === \"string\" || typeof payload.sub === \"string\") {\n        return payload.user_id || payload.sub;\n      }",
    "const decoded = await admin.auth().verifyIdToken(token);\n      return decoded.uid;"
)

# Add await to getUidFromAuthHeader calls
code = re.sub(r'getUidFromAuthHeader\(', 'await getUidFromAuthHeader(', code)
# Fix the declaration itself which matched
code = code.replace('async function await getUidFromAuthHeader', 'async function getUidFromAuthHeader')

# Firestore SDK syntax transforms
code = code.replace("new GeoPoint(", "new admin.firestore.GeoPoint(")
code = code.replace("serverTimestamp()", "admin.firestore.FieldValue.serverTimestamp()")
code = code.replace("increment(1)", "admin.firestore.FieldValue.increment(1)")

# Convert collection, doc, query, getDocs, updateDoc, setDoc
code = re.sub(r'collection\s*\(\s*db\s*,\s*("[^"]+")\s*\)', r'db.collection(\1)', code)
code = re.sub(r'doc\s*\(\s*db\s*,\s*("[^"]+")\s*,\s*([^)]+)\s*\)', r'db.collection(\1).doc(\2)', code)

# getDocs(q) -> q.get()
# getDocs(collection(db, "reports")) -> db.collection("reports").get()
# getDoc(docRef) -> docRef.get()
code = re.sub(r'getDocs\s*\(\s*([^)]+)\s*\)', r'\1.get()', code)
code = re.sub(r'getDoc\s*\(\s*([^)]+)\s*\)', r'\1.get()', code)
code = re.sub(r'updateDoc\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)', r'\1.update(\2)', code)
code = re.sub(r'setDoc\s*\(\s*([^,]+)\s*,\s*([^,]+)(?:,\s*([^)]+))?\s*\)', lambda m: f"{m.group(1)}.set({m.group(2)}" + (f", {m.group(3)}" if m.group(3) else "") + ")", code)
code = re.sub(r'addDoc\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)', r'\1.add(\2)', code)

# query(col, where(...), limit(...)) -> col.where(...).limit(...)
# This requires a regex that matches `query(col, cond1, cond2)`
def repl_query(m):
    inner = m.group(1)
    # Split by comma but ignore commas inside parens or quotes
    parts = re.split(r',\s*(?![^()]*\))', inner)
    base = parts[0]
    modifiers = parts[1:]
    return base + "." + ".".join(modifiers)

code = re.sub(r'query\s*\(\s*(.*?)\s*\)', repl_query, code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
