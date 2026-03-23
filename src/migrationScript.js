import { db } from './firebase';
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

/**
 * SCRIPT PARA MIGRAR DADOS ANTIGOS
 * 
 * Execute este script UMA VEZ para migrar os dados existentes
 * e atribuir um userId a todos os documentos que não têm.
 * 
 * O userId usado será: "admin-default-user"
 * 
 * Após executar, você precisará criar um usuário com esse email
 * ou ajustar os IDs conforme necessário.
 */

export const migrarDadosAntigos = async () => {
  const ADMIN_USER_ID = "admin-default-user"; // ID do usuário admin padrão
  
  try {
    console.log("Iniciando migração de dados...");
    
    const querySnapshot = await getDocs(collection(db, "transacoes"));
    let documentosAtualizados = 0;
    let documentosSemAtualizacao = 0;
    
    for (const documento of querySnapshot.docs) {
      const dados = documento.data();
      
      // Se já tem userId, pule
      if (dados.userId) {
        console.log(`Documento ${documento.id} já possui userId: ${dados.userId}`);
        documentosSemAtualizacao++;
        continue;
      }
      
      // Atualiza o documento adicionando userId
      try {
        await updateDoc(doc(db, "transacoes", documento.id), {
          userId: ADMIN_USER_ID
        });
        console.log(`✓ Documento ${documento.id} atualizado com userId: ${ADMIN_USER_ID}`);
        documentosAtualizados++;
      } catch (erro) {
        console.error(`✗ Erro ao atualizar documento ${documento.id}:`, erro);
      }
    }
    
    console.log(`
      ✓ Migração concluída!
      - Documentos atualizados: ${documentosAtualizados}
      - Documentos que já tinham userId: ${documentosSemAtualizacao}
      - Total de documentos: ${documentosAtualizados + documentosSemAtualizacao}
    `);
    
    alert(`Migração concluída! ${documentosAtualizados} documentos foram atualizados.`);
    
  } catch (erro) {
    console.error("Erro durante a migração:", erro);
    alert("Erro ao migrar dados. Verifique o console.");
  }
};

// Para executar, chame:
// import { migrarDadosAntigos } from './migrationScript';
// migrarDadosAntigos();
