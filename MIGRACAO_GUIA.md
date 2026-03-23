# 🔒 Guia de Migração: Do Modo Teste para Autenticação Google

## ✅ Alterações Realizadas

1. **Autenticação Google** - Login implementado
2. **Proteção de Dados** - Cada usuário vê apenas seus dados
3. **Novos Registros** - Automaticamente associados ao usuário logado

---

## 📋 Próximos Passos OBRIGATÓRIOS

### Passo 1: Atualizar Regras do Firestore

> ⏰ **Tempo estimado: 5 minutos**

1. Acesse: https://console.firebase.google.com/
2. Selecione projeto: **motorista-app-a0d2e**
3. No menu esquerdo: **Firestore Database**
4. Clique na aba: **Rules**
5. Substitua as regras por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transacoes/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

6. Clique em **Publicar**

---

### Passo 2: Migrar Dados Antigos

> ⏰ **Tempo estimado: 2 minutos**

Seus dados atuais não têm `userId` associado. Precisamos adicionar isso.

#### Opção A: Automático (Recomendado)

1. Abra seu `src/main.jsx`
2. Adicione esta linha TEMPORARIAMENTE (logo após importações):

```javascript
import { migrarDadosAntigos } from './migrationScript';

// Chame uma única vez
migrarDadosAntigos();
```

3. Salve e o script executará automaticamente
4. Verifique o console do navegador (F12) para confirmação
5. **REMOVA** essa linha depois que terminar

#### Opção B: Manual (Console Firebase)

1. No Firebase Console → Firestore Database
2. Clique em cada documento e edite manualmente
3. Adicione o campo `userId` com valor: `admin-default-user`

---

### Passo 3: Primeiro Login

Após migrar os dados:

1. Acesse a aplicação
2. Clique em **"Entrar com Google"**
3. Faça login com sua conta Google
4. ⚠️ **Importante**: Você SÓ verá dados se tiverem `userId` que corresponda

---

## 🎯 Próximas Ações

Após os 3 passos acima:

### Para Ver Dados Antigos com Novo Login

**Opção 1**: Crie um script que atribua os dados ao seu userId real:

```javascript
import { db } from './firebase';
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function reassignDataToCurrentUser(userIdReal) {
  const querySnapshot = await getDocs(collection(db, "transacoes"));
  
  for (const documento of querySnapshot.docs) {
    await updateDoc(doc(db, "transacoes", documento.id), {
      userId: userIdReal
    });
  }
}

// Chame com seu actual userId do Google
// reassignDataToCurrentUser("seu-email-google-uid");
```

**Opção 2**: Crie um novo admin com email específico e use suas transações

---

## 📱 Testando a Segurança

1. Faça login com uma conta Google
2. Crie alguns novos registros - eles aparecerão
3. Faça logout
4. Faça login com outra conta Google - os dados anteriores **não aparecerão** ✅

---

## ❓ Dúvidas Frequentes

**P: Por que não vejo meus dados antigos depois de fazer login?**
R: Seus dados antigos não têm userId. Execute o script de migração.

**P: Posso recuperar os dados se cometi erro na migração?**
R: Sim, os dados ainda estão lá. Use o passo 3 (Opção B) para adicionar userId manualmente.

**P: E se perder acesso à minha conta Google?**
R: Crie uma nova conta e um novo usuário poderá ter seus próprios dados.

---

## 🔐 Segurança Agora

✅ Apenas usuários autenticados acessam
✅ Cada usuário vê apenas seus dados
✅ Protegido contra acesso não autorizado
✅ Pronto para produção

---

**Próximo passo**: Execute o Passo 1 (Atualizar Regras) ➡️
