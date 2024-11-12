document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = '88a975d2';
    const API_KEY_NEWS = '701879c6ddcb46c78ed9183dad95ed13';
    const stockSelect = document.getElementById('stock-select');
    const addStockBtn = document.getElementById('add-stock-btn');
    const stocksContainer = document.getElementById('stocks-container');
    const messageContainer = document.getElementById('message-container');
    const sidebarButtons = document.querySelectorAll('.nav-link');
    const contentCards = document.querySelectorAll('.content-card');

    let selectedStocks = [];  
    let portfolio = {};       
    let pieChart;             


//----------------------------------------------SIDEBAR-------------------------------------------------\\
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            contentCards.forEach(card => {
                if (card.id === targetId) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        });
    });

//----------------------------------------------NOTICIAS-------------------------------------------------\\

const newsContainer = document.getElementById('news-container');

async function fetchFinancialNews() {
    try {
        const response = await fetch(`https://newsapi.org/v2/everything?q=mercado%20financeiro&language=pt&sortBy=publishedAt&apiKey=${API_KEY_NEWS}`);
        const data = await response.json();

        if (data.articles && data.articles.length > 0) {
            displayNews(data.articles);
        } else {
            newsContainer.innerHTML = "<p>Não foram encontradas notícias no momento.</p>";
        }
    } catch (error) {
        console.error("Erro ao buscar notícias:", error);
        newsContainer.innerHTML = "<p>Erro ao carregar notícias.</p>";
    }
}

function displayNews(articles) {
    newsContainer.innerHTML = '';
    articles.slice(0, 10).forEach(article => { 
        const newsItem = document.createElement("div");
        newsItem.classList.add("news-item");

        newsItem.innerHTML = `
            <h4><a href="${article.url}" target="_blank">${article.title}</a></h4>
            <p>${article.description || "Sem descrição disponível."}</p>
            <small>Fonte: ${article.source.name} - ${new Date(article.publishedAt).toLocaleDateString('pt-BR')}</small>
        `;
        newsContainer.appendChild(newsItem);
    });
}

fetchFinancialNews();

//-------------------------------------------GRÁFICO DE AÇÕES-------------------------------------------\\
    // Função para buscar dados de uma ação
    const fetchStockData = async (symbol) => {
        const url = `/api/finance/stock_price?key=${API_KEY}&symbol=${symbol}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results[symbol];
        } catch (error) {
            console.error('Error fetching stock data:', error);
            return null;
        }
    };

    // Função para criar um elemento de ação na interface
    const createStockElement = (stockData) => {
        const stockElement = document.createElement('div');
        stockElement.classList.add('stock');
        stockElement.id = `stock-${stockData.symbol}`;
    
        stockElement.innerHTML = `
            <button class="delete-btn">X</button>
            <img src="./img/${stockData.symbol}.png">
            <h2>${stockData.name} (${stockData.symbol})</h2>
            <p class="stock-price">${stockData.price.toFixed(2)}</p>
            <p>Última atualização: ${new Date(stockData.updated_at).toLocaleString()}</p>
            <canvas id="chart-${stockData.symbol}" width="400" height="200"></canvas>
        `;
        stocksContainer.appendChild(stockElement);
    
        // Inicializa o gráfico deste stock
        initializeChart(stockData.symbol);
    
        // Configura o botão de excluir
        stockElement.querySelector('.delete-btn').addEventListener('click', () => {
            removeStock(stockData.symbol);
        });

        // Atualiza os dados da ação a cada 30 segundos
        setInterval(() => updateStock(stockData.symbol), 30000);
    };

    // Função para inicializar o gráfico
    const initializeChart = async (symbol) => {
        const chartElement = document.getElementById(`chart-${symbol}`);
        const stockData = await fetchStockData(symbol);

        if (!stockData) return;

    const chartData = {
        datasets: [{
            label: 'Preço',
            data: [{
                x: new Date(stockData.updated_at),  // Tempo no eixo X
                y: stockData.price  // Preço no eixo Y
            }],
            borderColor: 'rgb(242, 207, 86)',
            backgroundColor: 'rgba(242, 207, 86, 0.2)',
            fill: false,
            tension: 0.1
        }]
    };

    const chartInstance = new Chart(chartElement, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        tooltipFormat: 'll HH:mm:ss',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tempo'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Preço'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });

        // Armazenar a instância do gráfico no elemento para facilitar atualizações
        chartElement.chartInstance = chartInstance;

        // Atualizar o gráfico a cada 60 segundos
        setInterval(async () => {
            await updateStock(symbol, true);
        }, 60000);  // 60 segundos
    };

    // Função para atualizar o gráfico com novos dados
    const updateStock = async (symbol, periodicUpdate = false) => {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            const stockElement = document.getElementById(`stock-${symbol}`);
            const priceElement = stockElement.querySelector('.stock-price');
            const previousPrice = parseFloat(priceElement.textContent);
            const currentPrice = parseFloat(stockData.price);

        // Atualiza o preço exibido
        priceElement.textContent = currentPrice.toFixed(2);

        // Atualiza a cor do preço com base na variação
        if (currentPrice > previousPrice) {
            priceElement.classList.remove('price-down');
            priceElement.classList.add('price-up');
        } else if (currentPrice < previousPrice) {
            priceElement.classList.remove('price-up');
            priceElement.classList.add('price-down');
        }

        // Atualiza o gráfico com os novos dados
        const chartElement = document.getElementById(`chart-${symbol}`);
        const chartInstance = chartElement.chartInstance;
        if (chartInstance) {
            chartInstance.data.datasets[0].data.push({
                x: new Date(),  // Atualiza o tempo no eixo X
                y: currentPrice  // Mantém o preço atual no eixo Y
            });

                // Remove dados antigos para evitar excesso de pontos no gráfico
                if (chartInstance.data.datasets[0].data.length > 60) {
                    chartInstance.data.datasets[0].data.shift();
                }

                chartInstance.update();
            }
        }
    };


//----------------------------------------------PORTFÓLIO-----------------------------------------------\\
    // Adiciona uma nova ação ao portfólio quando o botão é clicado
    addStockBtn.addEventListener('click', async () => {
        const symbol = stockSelect.value.toUpperCase().trim();
        if (symbol && !selectedStocks.includes(symbol)) {
            const stockData = await fetchStockData(symbol);
            if (stockData) {
                selectedStocks.push(symbol);
                createStockElement(stockData);
            } else {
                alert('Código de ação inválido ou não encontrado.');
            }
        }

        // Adicione a nova ação à grade de cotações
        updateQuotesGrid();
    });

    // Remove uma ação do portfólio
    const removeStock = (symbol) => {
        const stockElement = document.getElementById(`stock-${symbol}`);
        if (stockElement) {
            stocksContainer.removeChild(stockElement);
            selectedStocks = selectedStocks.filter(stock => stock !== symbol);
        }

        // Remove a ação à grade de cotações
        updateQuotesGrid();
    };

    // Atualiza a tabela do portfólio e o gráfico de pizza
    const updatePortfolioTable = () => {
        const portfolioBody = document.getElementById('portfolio-body');
        portfolioBody.innerHTML = '';
    
        let totalGasto = 0;
        const labels = [];
        const data = [];
    
        for (const symbol in portfolio) {
            const stock = portfolio[symbol];
            const currentPrice = stock.currentPrice.toFixed(2).replace('.', ',');
            const totalGastoAção = (stock.quantity * stock.averagePrice).toFixed(2);
            totalGasto += parseFloat(totalGastoAção);
    
            // Formatação do total gasto
            const formattedTotalGasto = parseFloat(totalGastoAção).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
    
            // Adiciona dados ao gráfico de pizza
            labels.push(symbol);
            data.push(stock.quantity);
    
            const row = `
                <tr id="portfolio-row-${symbol}">
                    <td>${symbol}</td>
                    <td>${stock.quantity}</td>
                    <td>${stock.averagePrice.toFixed(2).replace('.', ',')}</td>
                    <td>${currentPrice}</td>
                    <td>${formattedTotalGasto}</td>
                </tr>
            `;
            portfolioBody.insertAdjacentHTML('beforeend', row);
        }
        
        // Atualiza o gráfico de pizza e o total gasto
        updatePieChart(labels, data);
        document.getElementById('total-gasto').textContent = totalGasto.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    // Atualiza o gráfico de pizza com base nos dados do portfólio
    const updatePieChart = (labels, data) => {
        const ctx = document.getElementById('portfolio-pie-chart').getContext('2d');
    
        if (pieChart) {
            pieChart.destroy();
        }
    
        pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#ff6f61', //(Rosa coral)
                        '#6a1b9a', //(Roxo vibrante)
                        '#00bfae', //(Turquesa)
                        '#fbc02d', //(Amarelo dourado)
                        '#d32f2f', //(Vermelho profundo)
                        '#1976d2', //(Azul elétrico)
                        '#388e3c', //(Verde esmeralda)
                        '#f57c00', //(Laranja queimado)
                        '#e91e63', //(Rosa choque)
                        '#0288d1', //(Azul ciano)
                        // Adicionar mais cores pessoal (o tanto de ações que tiver, para ficar 1 para 1)
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.raw} ações`
                        }
                    },
                    legend: {
                        position: 'top',
                    },
                }
            }
        });
    };


//-------------------------------------------HISTÓRICO DE TRANSAÇÕES------------------------------------\\
    // Adiciona uma transação ao histórico de transações
    const addTransactionToHistory = (type, symbol, quantity, price) => {
        const transactionHistoryBody = document.getElementById('transaction-history-body');
        const transactionHistoryContainer = document.getElementById('transaction-history-container');
    
        // Cria uma nova linha para a tabela
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${type}</td>
            <td>${new Date().toLocaleString()}</td>
            <td>${symbol}</td>
            <td>${quantity}</td>
            <td>${price.toFixed(2).replace('.', ',')}</td>
        `;
        transactionHistoryBody.appendChild(row);

        // Exibe o histórico e remove a mensagem de vazio
        if (transactionHistoryContainer) {
            transactionHistoryContainer.style.display = 'block';
        }

        // Verifica se é a primeira transação
        const noTransactionsMessage = document.getElementById('no-transactions-message');
        if (noTransactionsMessage) {
            noTransactionsMessage.style.display = 'none';
        }
    };

    // Função para verificar e exibir mensagem quando não houver transações
    const checkEmptyHistory = () => {
        const transactionHistoryBody = document.getElementById('transaction-history-body');
        const transactionHistoryContainer = document.getElementById('transaction-history-container');

        if (transactionHistoryBody.children.length === 0) {
            if (transactionHistoryContainer) {
                transactionHistoryContainer.style.display = 'block';
            }

            const noTransactionsMessage = document.getElementById('no-transactions-message');
            if (!noTransactionsMessage) {
                // Cria e exibe a mensagem de "nenhuma transação"
                const message = document.createElement('p');
                message.id = 'no-transactions-message';
                message.textContent = 'Nenhuma transação registrada ainda.';
                message.style.color = '#f2cf56'; // Cor da mensagem (utilize sua paleta)
                message.style.fontSize = '1.2em';
                message.style.textAlign = 'center';
                transactionHistoryContainer.appendChild(message);
            } else {
                noTransactionsMessage.style.display = 'block';
            }
        }
    };
    
    // Chama a função para verificar o histórico vazio no início ou após alguma ação
    checkEmptyHistory();


//--------------------------------------------COMPRA E VENDA 1------------------------------------------\\    
    // Função para comprar ações
    const buyStock = (symbol, quantity, currentPrice) => {
        if (!portfolio[symbol]) {
            portfolio[symbol] = {
                quantity: 0,
                averagePrice: 0,
                currentPrice: currentPrice
            };
        }

        const stock = portfolio[symbol];
        stock.averagePrice = (stock.averagePrice * stock.quantity + currentPrice * quantity) / (stock.quantity + quantity);
        stock.quantity += quantity;
        stock.currentPrice = currentPrice;

        // Adiciona a compra no histórico de transação
        addTransactionToHistory('Compra', symbol, quantity, currentPrice);

        // Atualiza a tabela do portfólio
        updatePortfolioTable();
    };

    // Função para vender ações
    const sellStock = (symbol, quantity, currentPrice) => {
        if (!portfolio[symbol] || portfolio[symbol].quantity < quantity) {
            alert('Você não tem ações suficientes para vender.');
            return;
        }

        const stock = portfolio[symbol];
        stock.quantity -= quantity;
        stock.currentPrice = currentPrice;

        if (stock.quantity === 0) {
            delete portfolio[symbol];
        }

        // Adiciona a venda no histórico de transação
        addTransactionToHistory('Venda', symbol, quantity, currentPrice);

        // Atualiza a tabela do portfólio
        updatePortfolioTable();
    };


//------------------------------------------------MENSAGEM---------------------------------------------\\
    // Função para exibir mensagens
    const showMessage = (message, type) => {
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = `alert ${type === 'success' ? 'alert-success' : 'alert-error'}`;
            
            // Rola a página até o contêiner de mensagens
            messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Limpa a mensagem após 5 segundos
            setTimeout(() => {
                messageContainer.textContent = '';
                messageContainer.className = '';
            }, 5000);
        } else {
            console.error('Message container not found.');
        }
    };


//--------------------------------------------COMPRA E VENDA 2------------------------------------------\\
    // Configura o evento de clique para o botão de compra
    document.getElementById('buy-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('portfolio-stock-select').value;
        const quantity = parseInt(document.getElementById('quantity-input').value);
        if (isNaN(quantity) || quantity <= 0) {
            showMessage('Digite uma quantidade válida.', 'error');
            return;
        }

        const stockData = await fetchStockData(symbol);
        if (stockData) {
            buyStock(symbol, quantity, stockData.price);
            showMessage('Compra realizada com sucesso.', 'success');
        } else {
            showMessage('Código de ação inválido ou não encontrado.', 'error');
        }
    });

    // Configura o evento de clique para o botão de venda
    document.getElementById('sell-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('portfolio-stock-select').value;
        const quantity = parseInt(document.getElementById('quantity-input').value);
        if (isNaN(quantity) || quantity <= 0) {
            showMessage('Digite uma quantidade válida.', 'error');
            return;
        }

        const stockData = await fetchStockData(symbol);
        if (stockData) {
            if (portfolio[symbol] && portfolio[symbol].quantity >= quantity) {
                sellStock(symbol, quantity, stockData.price);
                showMessage('Venda realizada com sucesso.', 'success');
            } else {
                showMessage('Você não tem ações suficientes para vender.', 'error');
            }
        } else {
            showMessage('Código de ação inválido ou não encontrado.', 'error');
        }
    });


//-------------------------------------------GRADE DE COTAÇÕES------------------------------------------\\
    const updateQuotesGrid = async () => {
        const quotesContainer = document.getElementById('quotes-container');
        quotesContainer.innerHTML = '';
    
        if (selectedStocks.length === 0) {
            // Exibe a mensagem se não houver ações selecionadas
            const messageElement = document.createElement('p');
            messageElement.textContent = 'Nenhuma ação selecionada na aba Gráficos.';
            messageElement.style.color = '#f2cf56';  //Cor da mensagem
            messageElement.style.fontSize = '1.2em';
            messageElement.style.textAlign = 'center';
            quotesContainer.appendChild(messageElement);
        } else {
            // Se houver ações selecionadas, exibe as cotações
            for (const symbol of selectedStocks) {
                const stockData = await fetchStockData(symbol);
    
                if (stockData) {
                    const quoteElement = document.createElement('div');
                    quoteElement.classList.add('quote');
    
                    quoteElement.innerHTML = `
                        <img src="./img/${stockData.symbol}.png">
                        <div class="quote-symbol">${stockData.symbol}</div>
                        <div class="quote-price">${stockData.price.toFixed(2)}</div>
                    `;
                    
                    quotesContainer.appendChild(quoteElement);
                }
            }
        }
    };


//------------------------------------------------MOEDAS-----------------------------------------------\\
    // Função para buscar dados de cotações de moedas
    const fetchCurrencyData = async () => {
        const url = `/api/finance?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log(data); 
            return data.results.currencies; 
        } catch (error) {
            console.error('Error fetching currency data:', error);
            return null;
        }
    };    
    

    // Função para exibir cotações de moedas na interface
    const displayCurrencyData = (currencies) => {
        const coinsList = document.getElementById('coins-list');
        coinsList.innerHTML = '';

        if (!currencies) {
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Não foi possível carregar as cotações de moedas.';
            coinsList.appendChild(errorMessage);
            return;
        }

        const currencySymbols = {
            'USD': 'Dólar Americano',
            'EUR': 'Euro',
            'GBP': 'Libra Esterlina',
            'ARS': 'Peso Argentino',
            'CAD': 'Dólar Canadense',
            'AUD': 'Dólar Australiano',
            'JPY': 'Iene Japonês',
            'CNY': 'Yuan Chinês',
            'BTC': 'Bitcoin'
        };

        for (const [symbol, currency] of Object.entries(currencies)) {
            if (currencySymbols[symbol]) {
                const currencyElement = document.createElement('div');
                currencyElement.classList.add('currency');
                currencyElement.innerHTML = `
                    <h3>${currencySymbols[symbol]} (${symbol})</h3>
                    <p>Preço: ${currency.buy.toFixed(2).replace('.', ',')}</p>
                    <p>Variação Diária: ${currency.variation.toFixed(2).replace('.', ',')}%</p>
                `;
                coinsList.appendChild(currencyElement);
            } else {
                console.log(`Moeda não encontrada: ${symbol}`);
            }
        }
    }
     
    
//-----------------------------------------------ÍNDICES-----------------------------------------------\\
    const fetchIndexData = async () => {
    const url = `/api/finance?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results.stocks; 
        } catch (error) {
        console.error('Erro ao buscar dados dos índices:', error);
        return null;
        }
    };

    const displayIndexData = (indices) => {
    const indicesList = document.getElementById('indices-list');
    indicesList.innerHTML = '';

    if (!indices) {
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Não foi possível carregar os índices.';
        indicesList.appendChild(errorMessage);
        return;
    }

    const indexSymbols = {
        'IBOVESPA': 'BM&F BOVESPA (Brazil)',
        'NASDAQ': 'NASDAQ Stock Market (EUA)',
        'DOWJONES': 'Dow Jones Industrial Average (EUA)',
        'IFIX': 'Índice de Fundos de Investimentos Imobiliários B3 (Brazil)',
        'CAC': 'CAC 40 (France)',
        'NIKKEI': 'Nikkei 225 (Japan)',
    };

    for (const [symbol, data] of Object.entries(indices)) {
        if (indexSymbols[symbol]) {
            const indexElement = document.createElement('div');
            indexElement.classList.add('index');
            indexElement.innerHTML = `
                <h3>${indexSymbols[symbol]}</h3>
                <p>Pontos: ${data.points !== undefined ? data.points.toFixed(2).replace('.', ',') : 'N/A'}</p>
                <p>Variação diária: ${data.variation !== undefined ? data.variation.toFixed(2).replace('.', ',') : 'N/A'}%</p>
            `;
            indicesList.appendChild(indexElement);
            } else {
              console.log(`Índice não encontrado: ${symbol}`);
            }
        }
    };


//-------------------------------------------------TAXAS------------------------------------------------\\
    const fetchRateData = async () => {
        const url = `/api/finance?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results.taxes; 
            } catch (error) {
            console.error('Erro ao buscar dados das taxas:', error);
            return null;
            }
        };

        const displayRateData = (taxas) => {
            const taxasList = document.getElementById('taxas-list');
            taxasList.innerHTML = '';

            if (!taxas) {
                const errorMessage = document.createElement('p');
                errorMessage.textContent = 'Não foi possível carregar as taxas.';
                taxasList.appendChild(errorMessage);
                return;
            }

            const rateSymbols = {
                '0': 'Taxas',
            };

            for (const [symbol, data] of Object.entries(taxas)) {
                if (rateSymbols[symbol]) {
                    const rateElement = document.createElement('div');
                    rateElement.classList.add('rate');
                    rateElement.innerHTML = `
                        <h3>${rateSymbols[symbol]}</h3>
                        <p>CDI: ${data.cdi !== undefined ? data.cdi.toFixed(2) : 'N/A'}%</p>
                        <p>SELIC: ${data.selic !== undefined ? data.selic.toFixed(2) : 'N/A'}%</p>
                    `;
                    taxasList.appendChild(rateElement);
                    } else {
                      console.log(`taxa não encontrada: ${symbol}`);
                    }
                }
            };

//------------------------------------------------FIIS-------------------------------------------------\\
    const fiisContainer = document.getElementById('fiis-table-body');

    // Lista de FIIs para consulta
    const fiisSymbols = ['BCFF11', 'KNRI11', 'HGLG11', 'MXRF11', 'VISC11', 'HGBS11', 'XPLG11', 'HGRE11'];

    // Função para buscar dados de um FII
    async function fetchFiiData(symbol) {
        try {
            const response = await fetch(`/api/finance/stock_price?key=${API_KEY}&symbol=${symbol}`);
            const data = await response.json();

            // Verifique se o símbolo tem dados válidos e exiba
            if (data && data.results && data.results[symbol]) {
                displayFii(data.results[symbol]);
            } else {
                console.log(`Nenhum dado encontrado para ${symbol}`);
            }
        } catch (error) {
            console.error(`Erro ao buscar dados para ${symbol}:`, error);
        }
    }

    // Função para exibir dados de um FII
    function displayFii(fii) {
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${fii.symbol}</td>
        <td>${fii.company_name}</td>
        <td>${fii.sector}</td>
        <td>R$ ${fii.financials.equity.toLocaleString('pt-BR')}</td>
        <td>${fii.financials.quota_count}</td>
        <td>R$ ${fii.financials.equity_per_share.toFixed(2)}</td>
        <td>${fii.financials.price_to_book_ratio.toFixed(2)}</td>
        <td>${fii.financials.dividends.yield_12m.toFixed(2)}%</td>
        <td>R$ ${fii.financials.dividends.yield_12m_sum.toFixed(2)}</td>
        <h1><br></br>
        `;
        fiisContainer.appendChild(row);
    }

    // Função para iterar pela lista de FIIs e buscar dados de cada um
    function fetchAllFiis() {
        fiisSymbols.forEach(symbol => fetchFiiData(symbol));
    }

    // Chama a função para buscar e exibir todos os FIIs na página
    fetchAllFiis();


//------------------------------------------------EXIT-------------------------------------------------\\
        document.getElementById("exit-button").addEventListener("click", function(event) {
            event.preventDefault(); // Evita o comportamento padrão do link
                if (confirm("Deseja realmente sair?")) {
                window.location.href = "index.html";
                } else {
                window.location.href = "homebroker.html"
                }
            });

//------------------------------------------------CALLBACK---------------------------------------------\\
    const updateRateData = async () => {   
        const taxas = await fetchRateData();
        displayRateData(taxas);
    };

    // Chama a função uma vez ao carregar a página e depois a cada 30 segundos
    updateRateData();
    setInterval(updateRateData, 30000);

    const updateIndexData = async () => {   
        const indices = await fetchIndexData();
        displayIndexData(indices);
    };

    // Chama a função uma vez ao carregar a página e depois a cada 30 segundos
    updateIndexData();
    setInterval(updateIndexData, 30000);

    const updateCurrencyData = async () => {
        const currencies = await fetchCurrencyData();
        displayCurrencyData(currencies);
    };
        
    // Chama a função uma vez ao carregar a página e depois a cada 30 segundos
    updateCurrencyData();
    setInterval(updateCurrencyData, 30000);

    // Chama a função uma vez ao carregar a página e depois a cada 30 segundos
    updateQuotesGrid();
    setInterval(updateQuotesGrid, 30000);

});
