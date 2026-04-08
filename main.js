import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let steps = [];

// Carrega os dados do Supabase
async function loadSteps() {
    const { data, error } = await supabase
        .from('status_financiamento')
        .select('*')
        .order('numero_passo', { ascending: true });

    if (error) {
        console.error("Erro ao carregar dados:", error);
        return;
    }

    steps = data || [];
    renderSteps();
}

// Atualiza o status (completed / pending) no banco
async function toggleStep(index, isChecked) {
    const step = steps[index];
    const novoStatus = isChecked ? 'completed' : 'pending';
    
    // Atualiza localmente primeiro para resposta imediata na tela
    step.status = novoStatus;
    renderSteps();

    // Salva no banco
    const { error } = await supabase
        .from('status_financiamento')
        .update({ status: novoStatus })
        .eq('id', step.id);

    if (error) console.error("Erro ao atualizar status:", error);
}

// Edita título e descrição
async function editStep(index) {
    const step = steps[index];
    const newTitle = prompt("Edite o nome da etapa:", step.titulo);
    if (newTitle === null) return;
    
    const newDesc = prompt("Edite a descrição (deixe em branco para remover):", step.descricao || "");
    if (newDesc === null) return;

    const tituloAtualizado = newTitle.trim() || step.titulo;
    const descAtualizada = newDesc.trim() || null;

    step.titulo = tituloAtualizado;
    step.descricao = descAtualizada;
    renderSteps();

    const { error } = await supabase
        .from('status_financiamento')
        .update({ titulo: tituloAtualizado, descricao: descAtualizada })
        .eq('id', step.id);

    if (error) console.error("Erro ao editar etapa:", error);
}

// Exclui uma etapa do banco
async function deleteStep(index) {
    const step = steps[index];
    if (confirm(`Tem certeza que deseja excluir a etapa "${step.titulo}"?`)) {
        
        // Remove da tela
        steps.splice(index, 1);
        renderSteps();

        // Remove do banco usando o UUID
        const { error } = await supabase
            .from('status_financiamento')
            .delete()
            .eq('id', step.id);

        if (error) console.error("Erro ao deletar:", error);
    }
}

// Adiciona nova etapa
async function addNewStep() {
    const numInput = document.getElementById('new-num');
    const titleInput = document.getElementById('new-title');
    const descInput = document.getElementById('new-desc');

    if (!numInput.value || !titleInput.value) {
        alert("Por favor, preencha o Número e o Nome da etapa.");
        return;
    }

    const novoPasso = {
        numero_passo: parseInt(numInput.value),
        titulo: titleInput.value,
        descricao: descInput.value || null,
        status: 'pending'
    };

    // Limpa os inputs
    numInput.value = '';
    titleInput.value = '';
    descInput.value = '';

    const { data, error } = await supabase
        .from('status_financiamento')
        .insert([novoPasso])
        .select();

    if (error) {
        console.error("Erro ao adicionar etapa:", error);
        return;
    }

    // Recarrega para pegar o UUID gerado pelo Supabase e manter a ordem
    loadSteps();
}

// Renderiza o HTML na tela
function renderSteps() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = ''; 

    let foundActive = false;

    steps.forEach((step, index) => {
        // Lógica de visualização (calcula quem é o "active" na hora)
        let visualStatus = step.status;
        if (step.status !== 'completed' && !foundActive) {
            visualStatus = 'active';
            foundActive = true;
        }

        const stepDiv = document.createElement('div');
        stepDiv.className = `step ${visualStatus}`;

        const marker = document.createElement('div');
        marker.className = 'step-marker';
        marker.innerHTML = step.status === 'completed' ? '✓' : step.numero_passo;

        const content = document.createElement('div');
        content.className = 'step-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'step-text';

        const title = document.createElement('label');
        title.className = 'step-title';
        title.innerText = `${step.numero_passo}. ${step.titulo}`;
        title.htmlFor = `chk-${step.id}`; 

        textDiv.appendChild(title);

        if (step.descricao) {
            const desc = document.createElement('div');
            desc.className = 'step-desc';
            desc.innerText = step.descricao;
            textDiv.appendChild(desc);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'step-actions';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'icon-btn';
        btnEdit.innerHTML = '✏️';
        btnEdit.onclick = () => editStep(index);

        const btnDelete = document.createElement('button');
        btnDelete.className = 'icon-btn';
        btnDelete.innerHTML = '🗑️';
        btnDelete.onclick = () => deleteStep(index);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'step-checkbox';
        checkbox.id = `chk-${step.id}`;
        checkbox.checked = step.status === 'completed';
        checkbox.addEventListener('change', (e) => toggleStep(index, e.target.checked));

        actionsDiv.appendChild(btnEdit);
        actionsDiv.appendChild(btnDelete);
        actionsDiv.appendChild(checkbox);

        content.appendChild(textDiv);
        content.appendChild(actionsDiv);

        stepDiv.appendChild(marker);
        stepDiv.appendChild(content);
        container.appendChild(stepDiv);
    });
}

// Event Listener para o botão de adicionar
document.getElementById('btn-add-step').addEventListener('click', addNewStep);

// Inicia o carregamento
loadSteps();
