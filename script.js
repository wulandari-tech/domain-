       function openNav() {
            document.getElementById("mySidebar").style.width = "250px";
        }

        function closeNav() {
            document.getElementById("mySidebar").style.width = "0";
        }
        function copyInput(inputId) {
            const input = document.getElementById(inputId);
            const btnCopy = document.querySelector(`[onclick="copyInput('${inputId}')"]`);
            if (input) {
                navigator.clipboard.writeText(input.value).then(() => {
                    btnCopy.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(()=>{
                        btnCopy.innerHTML = '<i class="fa fa-copy"></i>';
                    },1500);
                    console.log('Text copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    btnCopy.innerHTML = '<i class="fa fa-copy"></i>';
                });
            }
        }
        function getStoredSubdomains() {
            try {
                const storedData = localStorage.getItem('subdomains');
                return storedData ? JSON.parse(storedData) : [];
            } catch (error) {
                console.error("Error retrieving from localStorage:", error);
                return [];
            }
        }
        function saveSubdomain(subdomainData) {
            const subdomains = getStoredSubdomains();
            subdomains.push(subdomainData);
            try{
                localStorage.setItem('subdomains', JSON.stringify(subdomains));
            } catch (error) {
                console.error("Error saving to localStorage:", error);
            }
        }
        function deleteStoredSubdomain(index) {
            let subdomains = getStoredSubdomains();
            if (index >= 0 && index < subdomains.length) {
                subdomains.splice(index, 1);
                try {
                    localStorage.setItem('subdomains', JSON.stringify(subdomains));
                    loadStoredSubdomains();
                    Swal.fire({
                        title: 'Success!',
                        text: 'Subdomain removed from list.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } catch (error) {
                    console.error("Error deleting from localStorage:", error);
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to remove subdomain.',
                        icon: 'error',
                    });
                }
            }
        }
        function toggleTargetInput() {
            const typeSelect = document.getElementById('type');
            const targetLabel = document.getElementById('targetLabel');
            const targetInput = document.getElementById('target');
            if (typeSelect.value === 'A') {
                targetLabel.textContent = 'IP ADDRESS:';
                targetInput.placeholder = 'IP Address';
                targetInput.pattern = "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$";
                targetInput.title = "Enter a valid IP address (e.g., 192.168.1.1)";
            } else if (typeSelect.value === 'CNAME') {
                targetLabel.textContent = 'CNAME TARGET:';
                targetInput.placeholder = 'CNAME Target';
                targetInput.pattern = "^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$";
                targetInput.title = "Enter a valid CNAME target (e.g., target.example.com)";
            }
        }
        function loadStoredSubdomains() {
            const storedSubdomains = getStoredSubdomains();
            const subdomainListUl = $("#storedSubdomains");
            subdomainListUl.empty();

            if (storedSubdomains.length > 0) {
                storedSubdomains.forEach((subdomainData, index) => {
                    const listItem = `<li>
                                        <span>${subdomainData.host}.${subdomainData.domainName} (${subdomainData.type}) - Target: ${subdomainData.target}</span>
                                        <button class="delete-subdomain-btn" onclick="deleteStoredSubdomain(${index})"><i class="fas fa-trash"></i> Delete</button>
                                    </li>`;
                    subdomainListUl.append(listItem);
                });
            } else {
                subdomainListUl.append("<li>Belum ada subdomain tersimpan.</li>");
            }
        }

        function validateInput() {
            const host = $("#host").val();
            const target = $("#target").val();
            const type = $("#type").val();
            let isValid = true;
            let errorMessage = "";
            const subdomainRegex = /^[a-z0-9-]+$/;
            if (!subdomainRegex.test(host)) {
                isValid = false;
                errorMessage += "Subdomain harus hanya berisi huruf kecil, angka, dan tanda hubung.\n";
            }

            if (type === 'A') {
                const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
                if (!ipRegex.test(target)) {
                    isValid = false;
                    errorMessage += "Target harus berupa IP Address yang valid.\n";
                }
            } else if (type === 'CNAME') {
                const cnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
                if (!cnameRegex.test(target)) {
                    isValid = false;
                    errorMessage += "Target harus berupa CNAME yang valid.\n";
                }
            }

            if (!isValid) {
                Swal.fire({
                    title: 'Validation Error!',
                    html: `<pre style="text-align: left;">${errorMessage}</pre>`,
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
            }
            return isValid;
        }
// Fungsi untuk melakukan IP check
        function checkIP(ipAddress) {
            // Menampilkan loading indicator
            $("#ipCheckLoading").css("opacity", "1");

            // Simulasi delay untuk menampilkan loading indicator, ganti dengan API call yang sesungguhnya
            setTimeout(() => {
                // Sembunyikan loading indicator
                $("#ipCheckLoading").css("opacity", "0");

                // Tampilkan hasil dummy
                const isSuccess = Math.random() < 0.8; // 80% chance of success
                const resultMessage = isSuccess ? "IP address is valid and reachable." : "IP address is invalid or unreachable.";
                const resultClass = isSuccess ? "success" : "error";
                $("#ipCheckResult").html(`<p class="${resultClass}">${resultMessage}</p>`);
            }, 2000); // Delay 2 detik
        }

          // Function for Dukun AI request
        function askDukun(content) {
             $("#dukunLoading").css("opacity", "1");
            $.ajax({
                url: '/dukun',
                type: 'GET',
                data: { content: content },
                success: function (response) {
                    $("#dukunLoading").css("opacity", "0");
                      if (response.result) {
                        $('#dukun-response').html(`
                         <label>Jawaban Dukun AI:</label>
                           <pre>${JSON.stringify(response.data, null, 2)}</pre>`);
                         $("#dukun-result").show();
                     } else {
                           $('#dukun-response').html(`<p class="dukun-error-message">${response.message}</p>`);
                          $("#dukun-result").show();
                     }
                },
                 error: function(xhr, status, error) {
                     $("#dukunLoading").css("opacity", "0");
                     let errorMessage;
                        try {
                           const errorData = JSON.parse(xhr.responseText);
                            errorMessage = errorData?.message ||  "An error occurred: "+ error;
                           console.error("Error from server:", errorData);
                           console.error("error:", errorMessage);
                       } catch (e) {
                           errorMessage = "An error occurred: "+ error;
                            console.error("Could not parse error response:", xhr.responseText, e);
                            console.error("error:", errorMessage);
                        }
                       $('#dukun-response').html(`<p class="dukun-error-message">${errorMessage}</p>`);
                        $("#dukun-result").show();
                }
            });
        }

        $(document).ready(function() {
            const lastDomain = localStorage.getItem('lastDomain');
            if (lastDomain) {
                $("#domainName").val(lastDomain);
            }
            $("#subdomainForm").submit(function(event) {
                event.preventDefault();
                if (!validateInput()) {
                    return;
                }
                const host = $("#host").val();
                const target = $("#target").val();
                const type = $("#type").val();
                const domainName = $("#domainName").val();
                const proxied = $("#proxied").val();

                const apiEndpoint = type === 'A' ? '/create-a-record' : '/create-cname-record';
                 $.ajax({
                    url: apiEndpoint,
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        host: host,
                        target: target,
                        domainName: domainName,
                         proxied: proxied,
                    }),
                    success: function(response) {
                         console.log("API Response:", response);
                        if (response.success) {
                            $('#response').html(`<p class="success-message">${response.message}</p>
                            <label>Data:</label>
                            <pre>${JSON.stringify(response.data, null, 2)}</pre>`);
                            $('#result').show();
                            saveSubdomain({host, target, type , domainName: domainName});
                            loadStoredSubdomains();
                            localStorage.setItem('lastDomain',domainName);
                            Swal.fire({
                                title: 'Success!',
                                text: response.message,
                                icon: 'success',
                                confirmButtonText: 'OK'
                            });
                        }else{
                             $('#response').html(`<p class="error-message">${response.error}</p>`);
                             $('#result').show();
                            Swal.fire({
                                title: 'Error!',
                                text: response.error,
                                icon: 'error',
                                confirmButtonText: 'OK'
                            });
                        }
                    },
                     error: function(xhr, status, error) {
                         let errorMessage;
                        try {
                            const errorData = JSON.parse(xhr.responseText);
                           errorMessage = errorData?.error ||  "An error occurred: "+ error;
                            console.error("Error from server:", errorData);
                            console.error("error:", errorMessage);
                        } catch (e) {
                           errorMessage = "An error occurred: "+ error;
                            console.error("Could not parse error response:", xhr.responseText, e);
                            console.error("error:", errorMessage);
                        }
                        $('#response').html(`<p class="error-message">${errorMessage}</p>`);
                        $('#result').show();
                         Swal.fire({
                             title: 'Error!',
                             text: errorMessage,
                            icon: 'error',
                             confirmButtonText: 'OK'
                         });

                    }
                });
            });
              // Event listener for Dukun AI button
            $('#ask-dukun').on('click', function() {
                 const content = $('#dukun-content').val();
                  if (content.trim() === "") {
                       $('#dukun-response').html(`<p class="dukun-error-message">Tolong masukan pertanyaan</p>`);
                       $('#dukun-result').show();
                   } else {
                       askDukun(content);
                  }
            });
            toggleTargetInput();
            loadStoredSubdomains();

            // Event listener untuk tombol Check IP
            $("#checkIpButton").click(function() {
                const ipAddress = $("#ipAddress").val();
                if (ipAddress) {
                    checkIP(ipAddress);
                } else {
                    $("#ipCheckResult").html('<p class="error">Please enter an IP address.</p>');
                }
            });
        });
